"""Utility nodes — Log, Run Command, Loop Counter, Type Convert."""
import asyncio
import subprocess
from engine.base_node import BaseNode, register_node
from engine.protocol import send_event


@register_node
class LogNode(BaseNode):
    type     = "log"
    label    = "Log"
    category = "Output"
    volatile = True

    inputs  = [{"name": "value", "type": "ANY", "label": "Value"}]
    outputs = [{"name": "value", "type": "ANY", "label": "Pass Through"}]
    config_schema = [
        {"name": "label", "type": "string", "label": "Label", "default": "LOG"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        value = inputs.get("value")
        label = config.get("label", "LOG")
        # Send to frontend console
        send_event("log", {"label": label, "value": str(value)[:500]})
        return {"value": value, "_display": f"[{label}] {str(value)[:200]}"}


@register_node
class RunCommandNode(BaseNode):
    type     = "run_command"
    label    = "Run Command"
    category = "System"
    volatile = True

    inputs  = [{"name": "command", "type": "STRING", "label": "Command", "optional": True}]
    outputs = [
        {"name": "stdout",    "type": "STRING", "label": "Output"},
        {"name": "stderr",    "type": "STRING", "label": "Error"},
        {"name": "exit_code", "type": "INT",    "label": "Exit Code"},
    ]
    config_schema = [
        {"name": "command", "type": "string", "label": "Command", "default": "", "multiline": True},
        {"name": "timeout", "type": "int",    "label": "Timeout (sec)", "default": 30, "min": 1, "max": 600},
        {"name": "shell",   "type": "bool",   "label": "Use Shell",    "default": True},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        cmd = inputs.get("command") or config.get("command", "")
        timeout = int(config.get("timeout", 30))
        use_shell = config.get("shell", True)

        if not cmd:
            raise RuntimeError("Command is required")

        loop = asyncio.get_event_loop()
        def _run():
            try:
                result = subprocess.run(
                    cmd, shell=use_shell, capture_output=True, text=True, timeout=timeout
                )
                return result.stdout, result.stderr, result.returncode
            except subprocess.TimeoutExpired:
                return "", "Command timed out", -1
            except Exception as e:
                return "", str(e), -1

        stdout, stderr, code = await loop.run_in_executor(None, _run)
        return {"stdout": stdout, "stderr": stderr, "exit_code": code}


@register_node
class LoopCounterNode(BaseNode):
    type     = "loop_counter"
    label    = "Loop Counter"
    category = "Control Flow"
    volatile = True

    # Uses a class-level counter that persists across loop iterations
    _counters: dict = {}

    inputs  = [{"name": "reset", "type": "BOOL", "label": "Reset", "optional": True}]
    outputs = [
        {"name": "count", "type": "INT",  "label": "Count"},
        {"name": "is_first", "type": "BOOL", "label": "Is First"},
    ]
    config_schema = [
        {"name": "counter_id", "type": "string", "label": "Counter ID", "default": "default"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        cid = config.get("counter_id", "default")
        reset = inputs.get("reset", False)

        if reset:
            LoopCounterNode._counters[cid] = 0

        count = LoopCounterNode._counters.get(cid, 0)
        LoopCounterNode._counters[cid] = count + 1

        return {"count": count, "is_first": count == 0}


@register_node
class TypeConvertNode(BaseNode):
    type     = "type_convert"
    label    = "Type Convert"
    category = "Data"

    inputs  = [{"name": "value", "type": "ANY", "label": "Value"}]
    outputs = [
        {"name": "string", "type": "STRING", "label": "String"},
        {"name": "number", "type": "FLOAT",  "label": "Number"},
        {"name": "integer","type": "INT",    "label": "Integer"},
        {"name": "bool",   "type": "BOOL",   "label": "Boolean"},
    ]
    config_schema = []

    async def execute(self, inputs: dict, config: dict) -> dict:
        val = inputs.get("value")
        s = str(val) if val is not None else ""
        try:
            n = float(val)
        except (TypeError, ValueError):
            n = 0.0
        try:
            i = int(float(val))
        except (TypeError, ValueError):
            i = 0
        b = bool(val)
        return {"string": s, "number": n, "integer": i, "bool": b}
