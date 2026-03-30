from engine.base_node import BaseNode, register_node


@register_node
class ConditionNode(BaseNode):
    type     = "condition"
    label    = "Condition"
    category = "Control Flow"
    volatile = True

    inputs  = [{"name": "value", "type": "ANY", "label": "Value"}]
    outputs = [
        {"name": "true_out",  "type": "ANY", "label": "True"},
        {"name": "false_out", "type": "ANY", "label": "False"},
    ]
    config_schema = [
        {"name": "expression", "type": "string",
         "label": "Python Expression",
         "default": "value == True",
         "placeholder": "e.g.  value > 10  or  'ok' in value"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        value = inputs.get("value")
        expr = config.get("expression", "value == True")
        try:
            result = bool(eval(expr, {"__builtins__": {}}, {"value": value}))
        except Exception as e:
            raise RuntimeError(f"Condition expression error: {e}")

        return {
            "true_out":  value if result else None,
            "false_out": value if not result else None,
        }
