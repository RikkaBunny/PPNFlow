"""
Quick smoke test for the Python engine (no Tauri needed).
Run: python engine/test_engine.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine.registry import get_all_schemas
from engine.graph import parse_graph
from engine.cache import ResultCache
from engine.executor import run_once


async def main():
    print("=== Loading node schemas ===")
    schemas = get_all_schemas()
    for s in schemas:
        print(f"  [{s['category']}] {s['type']} — {s['label']}")

    print("\n=== Running test graph: TextInput → Delay(100ms) → TextDisplay ===")

    graph_data = {
        "nodes": [
            {"id": "n1", "type": "text_input",   "config": {"value": "Hello, PPNFlow!"}},
            {"id": "n2", "type": "delay",         "config": {"ms": 100}},
            {"id": "n3", "type": "text_display",  "config": {}},
        ],
        "edges": [
            {"id": "e1", "source": "n1", "sourceHandle": "text",    "target": "n2", "targetHandle": "trigger"},
            {"id": "e2", "source": "n2", "sourceHandle": "trigger",  "target": "n3", "targetHandle": "text"},
        ],
        "settings": {}
    }

    graph = parse_graph(graph_data)
    cache = ResultCache()
    stop  = asyncio.Event()

    await run_once(graph, cache, stop, "test-001")
    print("\n=== Done ===")


if __name__ == "__main__":
    asyncio.run(main())
