"""
PPNFlow Python Execution Engine
Entry point: reads JSON-RPC requests from stdin, writes responses/events to stdout.

Supported methods:
  ping                          → {pong: true}
  get_node_schemas              → {schemas: [...]}
  execute_graph {graph, id, mode, loop_delay_ms}
  stop_execution {id}
"""
from __future__ import annotations
import asyncio
import logging
import sys
import os

# Ensure the engine package root is on sys.path when run as a script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine.protocol import read_message, send_result, send_error, send_event
from engine.registry import get_all_schemas
from engine.graph import parse_graph
from engine.cache import ResultCache
from engine.executor import run_once, run_loop

logging.basicConfig(
    level=logging.WARNING,
    format="%(levelname)s %(name)s: %(message)s",
    stream=sys.stderr,  # keep stderr separate from the JSON-RPC stdout stream
)

# ── State ─────────────────────────────────────────────────────────────────────
_cache = ResultCache()
_stop_events: dict[str, asyncio.Event] = {}  # execution_id → stop event
_running_tasks: dict[str, asyncio.Task] = {}  # execution_id → asyncio task


# ── Request handlers ──────────────────────────────────────────────────────────

async def handle_ping(req_id: str, _params: dict) -> None:
    send_result(req_id, {"pong": True})


async def handle_get_node_schemas(req_id: str, _params: dict) -> None:
    schemas = get_all_schemas()
    send_result(req_id, {"schemas": schemas})


async def handle_execute_graph(req_id: str, params: dict) -> None:
    graph_data = params.get("graph")
    execution_id = params.get("id", req_id)
    mode = params.get("mode", "once")           # "once" | "loop"
    loop_delay_ms = params.get("loop_delay_ms", 0)

    if not graph_data:
        send_error(req_id, "Missing 'graph' parameter")
        return

    try:
        graph = parse_graph(graph_data)
    except Exception as e:
        send_error(req_id, f"Invalid graph: {e}")
        return

    # Stop any existing execution with same id
    if execution_id in _stop_events:
        _stop_events[execution_id].set()

    stop_event = asyncio.Event()
    _stop_events[execution_id] = stop_event

    # Acknowledge the request immediately
    send_result(req_id, {"execution_id": execution_id, "status": "started"})

    # Run in background task
    if mode == "loop":
        coro = run_loop(graph, _cache, stop_event, execution_id, loop_delay_ms)
    else:
        coro = run_once(graph, _cache, stop_event, execution_id)

    task = asyncio.create_task(coro)
    _running_tasks[execution_id] = task

    def _on_done(t: asyncio.Task) -> None:
        _running_tasks.pop(execution_id, None)
        _stop_events.pop(execution_id, None)

    task.add_done_callback(_on_done)


async def handle_stop_execution(req_id: str, params: dict) -> None:
    execution_id = params.get("id")
    if execution_id and execution_id in _stop_events:
        _stop_events[execution_id].set()
        send_result(req_id, {"stopped": True})
    else:
        send_result(req_id, {"stopped": False, "reason": "not found"})


async def handle_clear_cache(req_id: str, _params: dict) -> None:
    _cache.clear()
    send_result(req_id, {"cleared": True})


HANDLERS = {
    "ping": handle_ping,
    "get_node_schemas": handle_get_node_schemas,
    "execute_graph": handle_execute_graph,
    "stop_execution": handle_stop_execution,
    "clear_cache": handle_clear_cache,
}


# ── Main loop ─────────────────────────────────────────────────────────────────

async def main() -> None:
    send_event("engine_ready", {"version": "0.1.0"})

    loop = asyncio.get_event_loop()

    while True:
        # Read from stdin in a thread so we don't block the event loop
        msg = await loop.run_in_executor(None, read_message)
        if msg is None:
            break  # stdin closed → exit

        req_id = msg.get("id")
        method = msg.get("method")
        params = msg.get("params", {})

        if not method:
            if req_id:
                send_error(req_id, "Missing 'method' field")
            continue

        handler = HANDLERS.get(method)
        if handler is None:
            if req_id:
                send_error(req_id, f"Unknown method: {method!r}")
            continue

        try:
            await handler(req_id, params)
        except Exception as exc:
            if req_id:
                send_error(req_id, str(exc))


if __name__ == "__main__":
    asyncio.run(main())
