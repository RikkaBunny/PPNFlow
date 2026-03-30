"""
JSON-RPC over stdin/stdout protocol.

Message format (newline-delimited JSON):
  Request:  {"id": "uuid", "method": "...", "params": {...}}
  Response: {"id": "uuid", "result": {...}}  or  {"id": "uuid", "error": "..."}
  Event:    {"event": "...", "data": {...}}   (no id, server → client)
"""
from __future__ import annotations
import json
import sys
from typing import Any


def read_message() -> dict | None:
    """Read one JSON line from stdin. Returns None on EOF."""
    line = sys.stdin.readline()
    if not line:
        return None
    return json.loads(line.strip())


def send_message(msg: dict) -> None:
    """Write one JSON line to stdout, flushed immediately."""
    sys.stdout.write(json.dumps(msg, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def send_event(event: str, data: Any = None) -> None:
    send_message({"event": event, "data": data})


def send_result(request_id: str, result: Any) -> None:
    send_message({"id": request_id, "result": result})


def send_error(request_id: str, error: str) -> None:
    send_message({"id": request_id, "error": error})
