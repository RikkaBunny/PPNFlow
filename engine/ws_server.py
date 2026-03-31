"""
PPNFlow Engine — WebSocket server mode.
Runs the same JSON-RPC handlers as main.py but over WebSocket
so the browser frontend can connect directly (no Tauri needed).

Usage: python engine/ws_server.py [--port 9320]
"""
from __future__ import annotations
import asyncio
import json
import logging
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine.registry import get_all_schemas
from engine.graph import parse_graph
from engine.cache import ResultCache
from engine.executor import run_once, run_loop
import engine.protocol as proto

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s: %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger("ws_server")

# ── State ──────────────────────────────────────────────────────────
_cache = ResultCache()
_stop_events: dict[str, asyncio.Event] = {}
_running_tasks: dict[str, asyncio.Task] = {}

# Current WebSocket connection (single client)
_ws_connection = None


def _send_to_ws(msg: dict):
    """Send a JSON message to the active WebSocket client."""
    global _ws_connection
    if _ws_connection is not None:
        asyncio.ensure_future(_ws_send_async(msg))


async def _ws_send_async(msg: dict):
    global _ws_connection
    try:
        if _ws_connection is not None:
            await _ws_connection.send(json.dumps(msg, ensure_ascii=False))
    except Exception:
        pass


# Monkey-patch protocol to send via WebSocket instead of stdout
proto.send_message = _send_to_ws


# ── Handlers (same as main.py) ────────────────────────────────────

async def handle_ping(req_id, _params):
    proto.send_result(req_id, {"pong": True})

async def handle_get_node_schemas(req_id, _params):
    schemas = get_all_schemas()
    proto.send_result(req_id, {"schemas": schemas})

async def handle_execute_graph(req_id, params):
    graph_data = params.get("graph")
    execution_id = params.get("id", req_id)
    mode = params.get("mode", "once")
    loop_delay_ms = params.get("loop_delay_ms", 0)

    if not graph_data:
        proto.send_error(req_id, "Missing 'graph' parameter")
        return

    try:
        graph = parse_graph(graph_data)
    except Exception as e:
        proto.send_error(req_id, f"Invalid graph: {e}")
        return

    if execution_id in _stop_events:
        _stop_events[execution_id].set()

    stop_event = asyncio.Event()
    _stop_events[execution_id] = stop_event

    proto.send_result(req_id, {"execution_id": execution_id, "status": "started"})

    if mode == "loop":
        coro = run_loop(graph, _cache, stop_event, execution_id, loop_delay_ms)
    else:
        coro = run_once(graph, _cache, stop_event, execution_id)

    task = asyncio.create_task(coro)
    _running_tasks[execution_id] = task

    def _on_done(t):
        _running_tasks.pop(execution_id, None)
        _stop_events.pop(execution_id, None)
    task.add_done_callback(_on_done)

async def handle_stop_execution(req_id, params):
    execution_id = params.get("id")
    if execution_id and execution_id in _stop_events:
        _stop_events[execution_id].set()
        proto.send_result(req_id, {"stopped": True})
    else:
        proto.send_result(req_id, {"stopped": False, "reason": "not found"})

async def handle_clear_cache(req_id, _params):
    _cache.clear()
    proto.send_result(req_id, {"cleared": True})

HANDLERS = {
    "ping": handle_ping,
    "get_node_schemas": handle_get_node_schemas,
    "execute_graph": handle_execute_graph,
    "stop_execution": handle_stop_execution,
    "clear_cache": handle_clear_cache,
}


# ── WebSocket handler ──────────────────────────────────────────────

async def ws_handler(websocket):
    global _ws_connection
    _ws_connection = websocket
    logger.info("Client connected")

    # Send engine ready
    await websocket.send(json.dumps({
        "event": "engine_ready", "data": {"version": "0.1.0"}
    }))

    try:
        async for raw in websocket:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            req_id = msg.get("id")
            method = msg.get("method")
            params = msg.get("params", {})

            if not method:
                if req_id:
                    proto.send_error(req_id, "Missing 'method' field")
                continue

            handler = HANDLERS.get(method)
            if handler is None:
                if req_id:
                    proto.send_error(req_id, f"Unknown method: {method!r}")
                continue

            try:
                await handler(req_id, params)
            except Exception as exc:
                if req_id:
                    proto.send_error(req_id, str(exc))
    except Exception as e:
        logger.info(f"Client disconnected: {e}")
    finally:
        _ws_connection = None


# ── Main ───────────────────────────────────────────────────────────

async def main():
    try:
        import websockets
    except ImportError:
        print("ERROR: websockets package required. Install with:")
        print("  pip install websockets")
        sys.exit(1)

    port = 9320
    if "--port" in sys.argv:
        idx = sys.argv.index("--port")
        if idx + 1 < len(sys.argv):
            port = int(sys.argv[idx + 1])

    logger.info(f"PPNFlow Engine (WebSocket) starting on ws://localhost:{port}")
    logger.info("Waiting for browser to connect...")

    async with websockets.serve(ws_handler, "localhost", port):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
