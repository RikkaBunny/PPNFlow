import json
from engine.base_node import BaseNode, register_node


@register_node
class JsonParseNode(BaseNode):
    type     = "json_parse"
    label    = "JSON Parse"
    category = "Data"

    inputs  = [{"name": "text", "type": "STRING", "label": "JSON String"}]
    outputs = [{"name": "data", "type": "JSON",   "label": "Data"}]
    config_schema = []

    async def execute(self, inputs: dict, config: dict) -> dict:
        text = inputs.get("text", "")
        data = json.loads(text)
        return {"data": data}
