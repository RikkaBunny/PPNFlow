"""
Graph executor:
  1. Topological sort (Kahn's algorithm)
  2. Sequential async execution with caching
  3. Real-time status events streamed to stdout
  4. Loop mode: re-executes the full graph until stop_event is set
"""
from __future__ import annotations
import asyncio
import time
import logging
from collections import defaultdict, deque
from typing import Any, Callable

from engine.graph import GraphDef, NodeDef
from engine.registry import get_node_class
from engine.cache import ResultCache
from engine.protocol import send_event

logger = logging.getLogger(__name__)


# ── Topological sort ──────────────────────────────────────────────────────────

def topological_sort(graph: GraphDef) -> list[str]:
    """
    Kahn's algorithm. Returns node ids in execution order.
    Raises ValueError if a cycle is detected (pure DAG required).
    """
    in_degree: dict[str, int] = {n.id: 0 for n in graph.nodes}
    dependents: dict[str, list[str]] = defaultdict(list)

    for edge in graph.edges:
        in_degree[edge.target] += 1
        dependents[edge.source].append(edge.target)

    queue: deque[str] = deque(nid for nid, deg in in_degree.items() if deg == 0)
    order: list[str] = []

    while queue:
        nid = queue.popleft()
        order.append(nid)
        for dep in dependents[nid]:
            in_degree[dep] -= 1
            if in_degree[dep] == 0:
                queue.append(dep)

    if len(order) != len(graph.nodes):
        raise ValueError("Graph contains a cycle — use Loop nodes for iteration")

    return order


# ── Input resolution ──────────────────────────────────────────────────────────

_ORDERING_SOURCES = frozenset({"success", "found", "value", "pass"})

def resolve_inputs(node: NodeDef, graph: GraphDef, outputs: dict[str, dict]) -> dict:
    """
    Build the inputs dict for a node by following edges.
    outputs: {node_id: {port_name: value}}

    Ordering edges (success→title, value→title, etc.) are detected and
    skipped so they don't pollute functional inputs that already have a
    config default.
    """
    resolved: dict[str, Any] = {}

    for edge in graph.edges:
        if edge.target != node.id:
            continue
        src_outputs = outputs.get(edge.source, {})
        value = src_outputs.get(edge.source_handle)

        # Always skip bool values (ordering signals)
        if isinstance(value, bool):
            continue
        if isinstance(value, str) and value in ("True", "False", "true", "false"):
            continue

        # Detect ordering edges: if the source handle is a generic
        # ordering output AND the target port already has a config value,
        # this edge is just for execution sequencing — skip it.
        if edge.source_handle in _ORDERING_SOURCES:
            cfg_val = node.config.get(edge.target_handle) or node.config.get(f"window_{edge.target_handle}")
            if cfg_val:
                continue

        resolved[edge.target_handle] = value

    return resolved


# ── Single graph execution pass ───────────────────────────────────────────────

def _find_downstream(node_id: str, handle: str, graph: GraphDef) -> set[str]:
    """Find all nodes reachable from node_id via a specific output handle."""
    # First, find direct targets of this handle
    direct = set()
    for edge in graph.edges:
        if edge.source == node_id and edge.source_handle == handle:
            direct.add(edge.target)

    # BFS to find all downstream nodes
    visited = set(direct)
    queue = deque(direct)
    while queue:
        nid = queue.popleft()
        for edge in graph.edges:
            if edge.source == nid and edge.target not in visited:
                visited.add(edge.target)
                queue.append(edge.target)
    return visited


async def execute_once(
    graph: GraphDef,
    cache: ResultCache,
    stop_event: asyncio.Event,
    execution_id: str,
) -> dict[str, dict]:
    """
    Execute nodes in topological order with conditional branch support.
    Condition nodes (type="condition") activate only one branch —
    the other branch's downstream nodes are skipped.
    """
    order = topological_sort(graph)
    node_map = {n.id: n for n in graph.nodes}
    all_outputs: dict[str, dict] = {}
    skipped: set[str] = set()

    for node_id in order:
        if stop_event.is_set():
            send_event("execution_stopped", {"execution_id": execution_id})
            return all_outputs

        # Skip nodes on inactive conditional branches
        if node_id in skipped:
            send_event("node_status", {"id": node_id, "status": "skipped"})
            continue

        node_def = node_map[node_id]
        node_cls = get_node_class(node_def.type)

        if node_cls is None:
            msg = f"Unknown node type: {node_def.type!r}"
            send_event("node_error", {"id": node_id, "error": msg})
            raise RuntimeError(msg)

        inputs = resolve_inputs(node_def, graph, all_outputs)
        config = node_def.config

        # Cache check (skip for volatile nodes)
        if not node_cls.volatile:
            cached = cache.get(node_def.type, inputs, config)
            if cached is not None:
                all_outputs[node_id] = cached
                send_event("node_cached", {"id": node_id})
                continue

        # Execute
        send_event("node_status", {"id": node_id, "status": "running"})
        t0 = time.monotonic()
        try:
            instance = node_cls()
            instance.ensure_dependencies()
            result = await instance.execute(inputs, config)
        except Exception as exc:
            elapsed = int((time.monotonic() - t0) * 1000)
            send_event("node_error", {
                "id": node_id,
                "error": str(exc),
                "ms": elapsed,
            })
            raise

        elapsed = int((time.monotonic() - t0) * 1000)

        # Store & cache
        all_outputs[node_id] = result
        if not node_cls.volatile:
            cache.put(node_def.type, inputs, config, result)

        # ── Conditional branch handling ──
        # If this is a condition node, mark the inactive branch as skipped
        if node_def.type == "condition" and result:
            took_true = result.get("true_out") is not None
            inactive = "false_out" if took_true else "true_out"
            active = "true_out" if took_true else "false_out"
            inactive_nodes = _find_downstream(node_id, inactive, graph)
            active_nodes = _find_downstream(node_id, active, graph)
            # Only skip nodes exclusive to the inactive branch
            exclusive_inactive = inactive_nodes - active_nodes
            skipped.update(exclusive_inactive)

        # Send completion + any previewable outputs
        send_event("node_status", {"id": node_id, "status": "done", "ms": elapsed})
        _send_previews(node_id, result)

    return all_outputs


def _send_previews(node_id: str, result: dict) -> None:
    """Send output values to the frontend for display in the Data tab."""
    for port_name, value in result.items():
        if value is None:
            continue
        # Internal keys (e.g. _preview_image) — send as-is
        if port_name.startswith("_"):
            if isinstance(value, str) and len(value) < 500_000:
                send_event("node_output", {
                    "id": node_id, "port": port_name, "preview": value,
                })
            continue
        # Base64 image data — send as-is
        if isinstance(value, str) and value.startswith("data:image"):
            send_event("node_output", {
                "id": node_id, "port": port_name, "preview": value,
            })
        # File paths (absolute or temp) — skip, frontend can't use them directly
        elif isinstance(value, str) and (value.startswith("/tmp") or value.startswith("C:\\") or value.startswith("/var")):
            continue
        # All other values (strings, numbers, bools, dicts, lists) — send as preview
        else:
            preview = value
            # Truncate very long strings
            if isinstance(preview, str) and len(preview) > 10_000:
                preview = preview[:10_000] + "...(truncated)"
            send_event("node_output", {
                "id": node_id, "port": port_name, "preview": preview,
            })


# ── Main entry points ─────────────────────────────────────────────────────────

async def run_once(graph: GraphDef, cache: ResultCache, stop_event: asyncio.Event, execution_id: str) -> None:
    send_event("execution_start", {"execution_id": execution_id, "mode": "once"})
    try:
        await execute_once(graph, cache, stop_event, execution_id)
        if not stop_event.is_set():
            send_event("execution_done", {"execution_id": execution_id})
    except Exception as exc:
        send_event("execution_error", {"execution_id": execution_id, "error": str(exc)})


async def run_loop(
    graph: GraphDef,
    cache: ResultCache,
    stop_event: asyncio.Event,
    execution_id: str,
    loop_delay_ms: int = 0,
) -> None:
    send_event("execution_start", {"execution_id": execution_id, "mode": "loop"})
    iteration = 0
    try:
        while not stop_event.is_set():
            iteration += 1
            send_event("loop_iteration", {"execution_id": execution_id, "iteration": iteration})
            # Don't use cache across loop iterations for volatile nodes (already handled),
            # but clear per-iteration cache for non-volatile ones so data flows fresh
            await execute_once(graph, cache, stop_event, execution_id)
            if stop_event.is_set():
                break
            if loop_delay_ms > 0:
                await asyncio.sleep(loop_delay_ms / 1000)
        send_event("execution_stopped", {"execution_id": execution_id, "iterations": iteration})
    except Exception as exc:
        send_event("execution_error", {
            "execution_id": execution_id,
            "error": str(exc),
            "iteration": iteration,
        })
