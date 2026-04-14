import asyncio
from engine.base_node import BaseNode, register_node


@register_node
class DelayNode(BaseNode):
    type     = "delay"
    label    = "Delay"
    category = "Control Flow"
    volatile = True

    inputs  = [{"name": "trigger", "type": "ANY", "label": "Trigger", "optional": True}]
    outputs = [{"name": "trigger", "type": "ANY", "label": "Trigger"}]
    config_schema = [
        {"name": "ms", "type": "int", "label": "Milliseconds", "default": 1000, "min": 0, "max": 60000},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        ms = int(config.get("ms", 1000))
        await asyncio.sleep(ms / 1000)
        return {"trigger": inputs.get("trigger", True)}
