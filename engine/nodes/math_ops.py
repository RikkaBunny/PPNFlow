"""Math/number nodes — math operation, number input, random."""
import random as rand_mod
from engine.base_node import BaseNode, register_node


@register_node
class NumberInputNode(BaseNode):
    type     = "number_input"
    label    = "Number Input"
    category = "Input"

    inputs  = []
    outputs = [{"name": "value", "type": "FLOAT", "label": "Value"}]
    config_schema = [
        {"name": "value", "type": "float", "label": "Value", "default": 0},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        return {"value": float(config.get("value", 0))}


@register_node
class MathNode(BaseNode):
    type     = "math"
    label    = "Math"
    category = "Data"

    inputs  = [
        {"name": "a", "type": "FLOAT", "label": "A"},
        {"name": "b", "type": "FLOAT", "label": "B", "optional": True},
    ]
    outputs = [{"name": "result", "type": "FLOAT", "label": "Result"}]
    config_schema = [
        {"name": "op", "type": "select", "label": "Operation", "default": "add",
         "options": ["add", "subtract", "multiply", "divide", "mod", "power", "min", "max", "abs"]},
        {"name": "b_fallback", "type": "float", "label": "B (fallback)", "default": 0},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        a = float(inputs.get("a", 0) or 0)
        b = float(inputs.get("b") if inputs.get("b") is not None else config.get("b_fallback", 0))
        op = config.get("op", "add")
        ops = {
            "add": a + b, "subtract": a - b, "multiply": a * b,
            "divide": a / b if b != 0 else 0,
            "mod": a % b if b != 0 else 0,
            "power": a ** b, "min": min(a, b), "max": max(a, b), "abs": abs(a),
        }
        return {"result": ops.get(op, a + b)}


@register_node
class RandomNumberNode(BaseNode):
    type     = "random_number"
    label    = "Random Number"
    category = "Input"
    volatile = True

    inputs  = []
    outputs = [
        {"name": "value",   "type": "FLOAT", "label": "Value"},
        {"name": "integer", "type": "INT",   "label": "Integer"},
    ]
    config_schema = [
        {"name": "min", "type": "float", "label": "Min", "default": 0},
        {"name": "max", "type": "float", "label": "Max", "default": 100},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        lo = float(config.get("min", 0))
        hi = float(config.get("max", 100))
        val = rand_mod.uniform(lo, hi)
        return {"value": val, "integer": int(val)}


@register_node
class CompareNode(BaseNode):
    type     = "compare"
    label    = "Compare"
    category = "Data"

    inputs  = [
        {"name": "a", "type": "ANY", "label": "A"},
        {"name": "b", "type": "ANY", "label": "B", "optional": True},
    ]
    outputs = [{"name": "result", "type": "BOOL", "label": "Result"}]
    config_schema = [
        {"name": "op", "type": "select", "label": "Operator", "default": "==",
         "options": ["==", "!=", ">", "<", ">=", "<=", "contains", "starts_with", "ends_with"]},
        {"name": "b_value", "type": "string", "label": "B (fallback)", "default": ""},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        a = inputs.get("a")
        b = inputs.get("b") if inputs.get("b") is not None else config.get("b_value", "")
        op = config.get("op", "==")

        # Try numeric comparison
        try:
            a_num, b_num = float(a), float(b)
            if op == "==": return {"result": a_num == b_num}
            if op == "!=": return {"result": a_num != b_num}
            if op == ">":  return {"result": a_num > b_num}
            if op == "<":  return {"result": a_num < b_num}
            if op == ">=": return {"result": a_num >= b_num}
            if op == "<=": return {"result": a_num <= b_num}
        except (TypeError, ValueError):
            pass

        # String comparison
        a_str, b_str = str(a), str(b)
        if op == "==": return {"result": a_str == b_str}
        if op == "!=": return {"result": a_str != b_str}
        if op == "contains":    return {"result": b_str in a_str}
        if op == "starts_with": return {"result": a_str.startswith(b_str)}
        if op == "ends_with":   return {"result": a_str.endswith(b_str)}
        return {"result": a_str == b_str}
