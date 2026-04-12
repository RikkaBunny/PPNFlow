"""
Comprehensive node tests — exercises every node that can run headlessly.
Nodes requiring a display (screenshot, mouse, keyboard, window, ocr) are skipped.

Run: python engine/test_engine.py
"""
import asyncio
import sys
import os
import json
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine.registry import get_all_schemas, load_all_nodes, get_node_class
from engine.graph import parse_graph
from engine.cache import ResultCache
from engine.executor import run_once

# Suppress JSON event output during tests
import engine.protocol as proto
_original_send = proto.send_message
_events: list[dict] = []
def _capture_event(msg):
    _events.append(msg)
proto.send_message = _capture_event

PASS = 0
FAIL = 0

def ok(name: str, condition: bool, detail: str = ""):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  [PASS] {name}")
    else:
        FAIL += 1
        suffix = f" - {detail}" if detail else ""
        print(f"  [FAIL] {name}{suffix}")

async def run_graph(graph_data: dict) -> dict[str, dict]:
    """Run a graph and return {node_id: outputs}."""
    _events.clear()
    graph = parse_graph(graph_data)
    cache = ResultCache()
    stop = asyncio.Event()
    result = {}
    # Monkey-patch executor to capture outputs
    from engine.executor import execute_once
    result = await execute_once(graph, cache, stop, "test")
    return result


async def test_text_input():
    print("\n[Text Input]")
    r = await run_graph({
        "nodes": [{"id": "n1", "type": "text_input", "config": {"value": "hello world"}}],
        "edges": [], "settings": {}
    })
    ok("outputs text", r["n1"]["text"] == "hello world")


async def test_number_input():
    print("\n[Number Input]")
    r = await run_graph({
        "nodes": [{"id": "n1", "type": "number_input", "config": {"value": 42.5}}],
        "edges": [], "settings": {}
    })
    ok("outputs float", r["n1"]["value"] == 42.5)


async def test_random_number():
    print("\n[Random Number]")
    r = await run_graph({
        "nodes": [{"id": "n1", "type": "random_number", "config": {"min": 10, "max": 20}}],
        "edges": [], "settings": {}
    })
    val = r["n1"]["value"]
    ok("in range", 10 <= val <= 20, f"got {val}")
    ok("has integer", isinstance(r["n1"]["integer"], int))


async def test_delay():
    print("\n[Delay]")
    r = await run_graph({
        "nodes": [{"id": "n1", "type": "delay", "config": {"ms": 50}}],
        "edges": [], "settings": {}
    })
    ok("returns trigger", r["n1"]["trigger"] is True)


async def test_json_parse():
    print("\n[JSON Parse]")
    r = await run_graph({
        "nodes": [
            {"id": "n1", "type": "text_input", "config": {"value": '{"name":"PPNFlow","v":2}'}},
            {"id": "n2", "type": "json_parse", "config": {}},
        ],
        "edges": [{"id": "e1", "source": "n1", "sourceHandle": "text", "target": "n2", "targetHandle": "text"}],
        "settings": {}
    })
    ok("parses correctly", r["n2"]["data"]["name"] == "PPNFlow")
    ok("numeric field", r["n2"]["data"]["v"] == 2)


async def test_extract_field():
    print("\n[Extract Field]")
    r = await run_graph({
        "nodes": [
            {"id": "n1", "type": "text_input", "config": {"value": '{"a":{"b":[10,20,30]}}'}},
            {"id": "n2", "type": "json_parse", "config": {}},
            {"id": "n3", "type": "extract_field", "config": {"path": "a.b.1"}},
        ],
        "edges": [
            {"id": "e1", "source": "n1", "sourceHandle": "text", "target": "n2", "targetHandle": "text"},
            {"id": "e2", "source": "n2", "sourceHandle": "data", "target": "n3", "targetHandle": "data"},
        ],
        "settings": {}
    })
    ok("nested path", r["n3"]["value"] == 20)


async def test_template():
    print("\n[Template]")
    r = await run_graph({
        "nodes": [
            {"id": "n1", "type": "text_input", "config": {"value": '{"name":"World","count":3}'}},
            {"id": "n2", "type": "json_parse", "config": {}},
            {"id": "n3", "type": "template", "config": {"template": "Hello {name}! Count={count}"}},
        ],
        "edges": [
            {"id": "e1", "source": "n1", "sourceHandle": "text", "target": "n2", "targetHandle": "text"},
            {"id": "e2", "source": "n2", "sourceHandle": "data", "target": "n3", "targetHandle": "data"},
        ],
        "settings": {}
    })
    ok("formats template", r["n3"]["result"] == "Hello World! Count=3")


async def test_condition():
    print("\n[Condition]")
    r = await run_graph({
        "nodes": [
            {"id": "n1", "type": "number_input", "config": {"value": 42}},
            {"id": "n2", "type": "condition", "config": {"expression": "value > 10"}},
        ],
        "edges": [{"id": "e1", "source": "n1", "sourceHandle": "value", "target": "n2", "targetHandle": "value"}],
        "settings": {}
    })
    ok("true branch", r["n2"]["true_out"] == 42.0)
    ok("false branch is None", r["n2"]["false_out"] is None)

    r2 = await run_graph({
        "nodes": [
            {"id": "n1", "type": "number_input", "config": {"value": 3}},
            {"id": "n2", "type": "condition", "config": {"expression": "value > 10"}},
        ],
        "edges": [{"id": "e1", "source": "n1", "sourceHandle": "value", "target": "n2", "targetHandle": "value"}],
        "settings": {}
    })
    ok("false when condition fails", r2["n2"]["true_out"] is None)
    ok("false branch has value", r2["n2"]["false_out"] == 3.0)


async def test_string_concat():
    print("\n[String Concat]")
    r = await run_graph({
        "nodes": [
            {"id": "n1", "type": "text_input", "config": {"value": "Hello"}},
            {"id": "n2", "type": "text_input", "config": {"value": "World"}},
            {"id": "n3", "type": "string_concat", "config": {"separator": " "}},
        ],
        "edges": [
            {"id": "e1", "source": "n1", "sourceHandle": "text", "target": "n3", "targetHandle": "a"},
            {"id": "e2", "source": "n2", "sourceHandle": "text", "target": "n3", "targetHandle": "b"},
        ],
        "settings": {}
    })
    ok("concatenates", r["n3"]["result"] == "Hello World")


async def test_string_replace():
    print("\n[String Replace]")
    r = await run_graph({
        "nodes": [
            {"id": "n1", "type": "text_input", "config": {"value": "foo bar foo"}},
            {"id": "n2", "type": "string_replace", "config": {"find": "foo", "replace": "baz"}},
        ],
        "edges": [{"id": "e1", "source": "n1", "sourceHandle": "text", "target": "n2", "targetHandle": "text"}],
        "settings": {}
    })
    ok("replaces all", r["n2"]["result"] == "baz bar baz")


async def test_string_split():
    print("\n[String Split]")
    r = await run_graph({
        "nodes": [
            {"id": "n1", "type": "text_input", "config": {"value": "a,b,c,d"}},
            {"id": "n2", "type": "string_split", "config": {"delimiter": ","}},
        ],
        "edges": [{"id": "e1", "source": "n1", "sourceHandle": "text", "target": "n2", "targetHandle": "text"}],
        "settings": {}
    })
    ok("splits correctly", r["n2"]["parts"] == ["a", "b", "c", "d"])
    ok("count", r["n2"]["count"] == 4)
    ok("first", r["n2"]["first"] == "a")
    ok("last", r["n2"]["last"] == "d")


async def test_regex():
    print("\n[Regex Match]")
    r = await run_graph({
        "nodes": [
            {"id": "n1", "type": "text_input", "config": {"value": "Resolution: 1920x1080 pixels"}},
            {"id": "n2", "type": "regex", "config": {"pattern": "(\\d+)x(\\d+)", "mode": "search"}},
        ],
        "edges": [{"id": "e1", "source": "n1", "sourceHandle": "text", "target": "n2", "targetHandle": "text"}],
        "settings": {}
    })
    ok("found", r["n2"]["found"] is True)
    ok("match", r["n2"]["match"] == "1920x1080")
    ok("groups", r["n2"]["groups"] == ["1920", "1080"])


async def test_math():
    print("\n[Math]")
    tests = [
        ("add", 10, 3, 13), ("subtract", 10, 3, 7), ("multiply", 4, 5, 20),
        ("divide", 10, 4, 2.5), ("mod", 10, 3, 1), ("power", 2, 8, 256),
        ("min", 5, 3, 3), ("max", 5, 3, 5),
    ]
    for op, a, b, expected in tests:
        r = await run_graph({
            "nodes": [
                {"id": "n1", "type": "number_input", "config": {"value": a}},
                {"id": "n2", "type": "math", "config": {"op": op, "b_fallback": b}},
            ],
            "edges": [{"id": "e1", "source": "n1", "sourceHandle": "value", "target": "n2", "targetHandle": "a"}],
            "settings": {}
        })
        ok(f"{op}({a},{b})={expected}", r["n2"]["result"] == expected, f"got {r['n2']['result']}")


async def test_compare():
    print("\n[Compare]")
    tests = [
        ("==", "10", "10", True), ("!=", "10", "20", True),
        (">", "10", "5", True), ("<", "3", "5", True),
        ("contains", "hello world", "world", True),
        ("starts_with", "hello", "hel", True),
        ("ends_with", "hello", "llo", True),
    ]
    for op, a, b, expected in tests:
        r = await run_graph({
            "nodes": [
                {"id": "n1", "type": "text_input", "config": {"value": a}},
                {"id": "n2", "type": "compare", "config": {"op": op, "b_value": b}},
            ],
            "edges": [{"id": "e1", "source": "n1", "sourceHandle": "text", "target": "n2", "targetHandle": "a"}],
            "settings": {}
        })
        ok(f"'{a}' {op} '{b}' = {expected}", r["n2"]["result"] == expected, f"got {r['n2']['result']}")


async def test_type_convert():
    print("\n[Type Convert]")
    r = await run_graph({
        "nodes": [
            {"id": "n1", "type": "text_input", "config": {"value": "42.5"}},
            {"id": "n2", "type": "type_convert", "config": {}},
        ],
        "edges": [{"id": "e1", "source": "n1", "sourceHandle": "text", "target": "n2", "targetHandle": "value"}],
        "settings": {}
    })
    ok("string", r["n2"]["string"] == "42.5")
    ok("number", r["n2"]["number"] == 42.5)
    ok("integer", r["n2"]["integer"] == 42)
    ok("bool", r["n2"]["bool"] is True)


async def test_loop_counter():
    print("\n[Loop Counter]")
    r = await run_graph({
        "nodes": [{"id": "n1", "type": "loop_counter", "config": {"counter_id": "test_ctr"}}],
        "edges": [], "settings": {}
    })
    ok("count starts at 0", r["n1"]["count"] == 0)
    ok("is_first", r["n1"]["is_first"] is True)


async def test_log():
    print("\n[Log]")
    r = await run_graph({
        "nodes": [
            {"id": "n1", "type": "text_input", "config": {"value": "test message"}},
            {"id": "n2", "type": "log", "config": {"label": "TEST"}},
        ],
        "edges": [{"id": "e1", "source": "n1", "sourceHandle": "text", "target": "n2", "targetHandle": "value"}],
        "settings": {}
    })
    ok("pass through", r["n2"]["value"] == "test message")
    ok("has display", "[TEST]" in r["n2"].get("_display", ""))


async def test_text_display():
    print("\n[Text Display]")
    r = await run_graph({
        "nodes": [
            {"id": "n1", "type": "text_input", "config": {"value": "shown text"}},
            {"id": "n2", "type": "text_display", "config": {}},
        ],
        "edges": [{"id": "e1", "source": "n1", "sourceHandle": "text", "target": "n2", "targetHandle": "text"}],
        "settings": {}
    })
    ok("displays text", r["n2"]["_display"] == "shown text")


async def test_file_io():
    print("\n[File Read / Write]")
    tmp = tempfile.NamedTemporaryFile(suffix=".txt", delete=False, mode="w")
    tmp.write("original content")
    tmp.close()

    # Read
    r = await run_graph({
        "nodes": [{"id": "n1", "type": "file_read", "config": {"path": tmp.name}}],
        "edges": [], "settings": {}
    })
    ok("reads file", r["n1"]["content"] == "original content")
    ok("has size", r["n1"]["size"] > 0)

    # Write
    out_path = tmp.name + ".out"
    r = await run_graph({
        "nodes": [
            {"id": "n1", "type": "text_input", "config": {"value": "new content"}},
            {"id": "n2", "type": "file_write", "config": {"path": out_path, "mode": "write"}},
        ],
        "edges": [{"id": "e1", "source": "n1", "sourceHandle": "text", "target": "n2", "targetHandle": "content"}],
        "settings": {}
    })
    ok("write success", r["n2"]["success"] is True)
    with open(out_path) as f:
        ok("content written", f.read() == "new content")

    # Append
    r = await run_graph({
        "nodes": [
            {"id": "n1", "type": "text_input", "config": {"value": " appended"}},
            {"id": "n2", "type": "file_write", "config": {"path": out_path, "mode": "append"}},
        ],
        "edges": [{"id": "e1", "source": "n1", "sourceHandle": "text", "target": "n2", "targetHandle": "content"}],
        "settings": {}
    })
    with open(out_path) as f:
        ok("append works", f.read() == "new content appended")

    os.unlink(tmp.name)
    os.unlink(out_path)


async def test_http_request():
    print("\n[HTTP Request]")
    try:
        r = await run_graph({
            "nodes": [{"id": "n1", "type": "http_request", "config": {
                "url": "https://httpbin.org/get", "method": "GET", "timeout": 5
            }}],
            "edges": [], "settings": {}
        })
        ok("status 200", r["n1"]["status_code"] == 200)
        ok("has response", len(r["n1"]["response"]) > 0)
        ok("has json", r["n1"]["json_data"] is not None)
    except Exception as e:
        # Network may not be available in CI/sandbox
        print(f"  [SKIP] network unavailable: {type(e).__name__}")


async def test_run_command():
    print("\n[Run Command]")
    r = await run_graph({
        "nodes": [{"id": "n1", "type": "run_command", "config": {"command": "echo hello_ppnflow", "timeout": 5}}],
        "edges": [], "settings": {}
    })
    ok("stdout", "hello_ppnflow" in r["n1"]["stdout"])
    ok("exit code 0", r["n1"]["exit_code"] == 0)


async def test_pipeline_text_to_json_to_condition():
    print("\n[Pipeline: Text -> JSON -> Extract -> Condition -> Log]")
    r = await run_graph({
        "nodes": [
            {"id": "n1", "type": "text_input", "config": {"value": '{"score": 85}'}},
            {"id": "n2", "type": "json_parse", "config": {}},
            {"id": "n3", "type": "extract_field", "config": {"path": "score"}},
            {"id": "n4", "type": "condition", "config": {"expression": "value >= 60"}},
            {"id": "n5", "type": "log", "config": {"label": "PASS"}},
        ],
        "edges": [
            {"id": "e1", "source": "n1", "sourceHandle": "text",     "target": "n2", "targetHandle": "text"},
            {"id": "e2", "source": "n2", "sourceHandle": "data",     "target": "n3", "targetHandle": "data"},
            {"id": "e3", "source": "n3", "sourceHandle": "value",    "target": "n4", "targetHandle": "value"},
            {"id": "e4", "source": "n4", "sourceHandle": "true_out", "target": "n5", "targetHandle": "value"},
        ],
        "settings": {}
    })
    ok("score extracted", r["n3"]["value"] == 85)
    ok("condition true", r["n4"]["true_out"] == 85)
    ok("log received value", r["n5"]["value"] == 85)


async def test_pipeline_math_chain():
    print("\n[Pipeline: Number -> Math(+10) -> Math(*2) -> Compare(>50)]")
    r = await run_graph({
        "nodes": [
            {"id": "n1", "type": "number_input", "config": {"value": 20}},
            {"id": "n2", "type": "math", "config": {"op": "add", "b_fallback": 10}},
            {"id": "n3", "type": "math", "config": {"op": "multiply", "b_fallback": 2}},
            {"id": "n4", "type": "compare", "config": {"op": ">", "b_value": "50"}},
        ],
        "edges": [
            {"id": "e1", "source": "n1", "sourceHandle": "value",  "target": "n2", "targetHandle": "a"},
            {"id": "e2", "source": "n2", "sourceHandle": "result", "target": "n3", "targetHandle": "a"},
            {"id": "e3", "source": "n3", "sourceHandle": "result", "target": "n4", "targetHandle": "a"},
        ],
        "settings": {}
    })
    ok("20+10=30", r["n2"]["result"] == 30)
    ok("30*2=60", r["n3"]["result"] == 60)
    ok("60>50 is True", r["n4"]["result"] is True)


async def test_list_filter():
    """Test list_filter node — filter, sort, and limit arrays."""
    print("\n[List Filter]")
    data = [
        {"name": "a", "score": 90, "duration": 300},
        {"name": "b", "score": 40, "duration": 700},
        {"name": "c", "score": 75, "duration": 120},
        {"name": "d", "score": 60, "duration": 500},
        {"name": "e", "score": 85, "duration": 200},
    ]
    r = await run_graph({
        "nodes": [
            {"id": "n1", "type": "text_input", "config": {"value": json.dumps(data)}},
            {"id": "n2", "type": "json_parse", "config": {}},
            {"id": "n3", "type": "list_filter", "config": {
                "expression": "item.get('duration', 0) <= 600",
                "limit": 3,
                "sort_by": "score",
            }},
        ],
        "edges": [
            {"id": "e1", "source": "n1", "sourceHandle": "text",   "target": "n2", "targetHandle": "text"},
            {"id": "e2", "source": "n2", "sourceHandle": "data",   "target": "n3", "targetHandle": "data"},
        ],
        "settings": {}
    })
    filtered = r["n3"]["result"]
    ok("filtered out duration>600", all(item["duration"] <= 600 for item in filtered))
    ok("limited to 3", len(filtered) == 3)
    ok("sorted by score desc", filtered[0]["score"] >= filtered[1]["score"])
    ok("count correct", r["n3"]["count"] == 3)


async def test_list_map():
    """Test list_map node — field extraction and URL template."""
    print("\n[List Map]")
    data = [
        {"bvid": "BV123", "title": "Hello", "duration": 120, "extra": "ignore"},
        {"bvid": "BV456", "title": "World", "duration": 300, "extra": "ignore"},
    ]
    r = await run_graph({
        "nodes": [
            {"id": "n1", "type": "text_input", "config": {"value": json.dumps(data)}},
            {"id": "n2", "type": "json_parse", "config": {}},
            {"id": "n3", "type": "list_map", "config": {
                "fields": "title, duration",
                "url_template": "https://www.bilibili.com/video/{bvid}",
                "summary_template": "{title} ({duration}s)",
            }},
        ],
        "edges": [
            {"id": "e1", "source": "n1", "sourceHandle": "text",   "target": "n2", "targetHandle": "text"},
            {"id": "e2", "source": "n2", "sourceHandle": "data",   "target": "n3", "targetHandle": "data"},
        ],
        "settings": {}
    })
    mapped = r["n3"]["result"]
    ok("count", r["n3"]["count"] == 2)
    ok("has title", mapped[0]["title"] == "Hello")
    ok("has duration", mapped[0]["duration"] == 120)
    ok("url generated", mapped[0]["url"] == "https://www.bilibili.com/video/BV123")
    ok("extra excluded", "extra" not in mapped[0])
    ok("summary has lines", "Hello (120s)" in r["n3"]["summary"])
    ok("first item", r["n3"]["first"]["title"] == "Hello")


async def test_video_download_schema():
    """Test video_download node schema registration."""
    print("\n[Video Download - Schema]")
    cls = get_node_class("video_download")
    ok("registered", cls is not None)
    if cls is None:
        return
    schema = cls.get_schema()
    ok("type", schema["type"] == "video_download")
    ok("category Network", schema["category"] == "Network")
    ok("volatile", schema["volatile"] is True)
    input_names = [i["name"] for i in schema["inputs"]]
    ok("input url", "url" in input_names)
    ok("input urls", "urls" in input_names)
    output_names = [o["name"] for o in schema["outputs"]]
    ok("output results", "results" in output_names)
    ok("output count", "count" in output_names)
    ok("output output_dir", "output_dir" in output_names)


async def test_generic_pipeline():
    """Test list_filter → list_map pipeline compatibility."""
    print("\n[Pipeline: List Filter -> List Map]")
    filter_cls = get_node_class("list_filter")
    map_cls    = get_node_class("list_map")
    dl_cls     = get_node_class("video_download")
    ok("filter exists", filter_cls is not None)
    ok("map exists", map_cls is not None)
    ok("download exists", dl_cls is not None)
    if not filter_cls or not map_cls or not dl_cls:
        return
    filter_out = {o["name"]: o["type"] for o in filter_cls.get_schema()["outputs"]}
    map_in     = {i["name"]: i["type"] for i in map_cls.get_schema()["inputs"]}
    dl_in      = {i["name"]: i["type"] for i in dl_cls.get_schema()["inputs"]}
    ok("filter→map: JSON compatible", filter_out.get("result") == map_in.get("data"))
    ok("filter→download: JSON compatible", filter_out.get("result") == dl_in.get("urls"))


async def main():
    print("=" * 60)
    print("  PPNFlow Engine - Comprehensive Node Tests")
    print("=" * 60)

    # Load all nodes
    load_all_nodes()
    schemas = get_all_schemas()
    print(f"\nLoaded {len(schemas)} node types\n")

    # Run individual node tests
    await test_text_input()
    await test_number_input()
    await test_random_number()
    await test_delay()
    await test_json_parse()
    await test_extract_field()
    await test_template()
    await test_condition()
    await test_string_concat()
    await test_string_replace()
    await test_string_split()
    await test_regex()
    await test_math()
    await test_compare()
    await test_type_convert()
    await test_loop_counter()
    await test_log()
    await test_text_display()
    await test_file_io()
    await test_http_request()
    await test_run_command()

    # Pipeline tests
    await test_pipeline_text_to_json_to_condition()
    await test_pipeline_math_chain()

    # Generic list & download nodes
    await test_list_filter()
    await test_list_map()
    await test_video_download_schema()
    await test_generic_pipeline()

    # Summary
    print("\n" + "=" * 60)
    total = PASS + FAIL
    if FAIL == 0:
        print(f"  ALL {total} TESTS PASSED")
    else:
        print(f"  {PASS}/{total} passed, {FAIL} FAILED")
    print("=" * 60)

    return FAIL == 0


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
