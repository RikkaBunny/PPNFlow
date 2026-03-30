from engine.base_node import BaseNode, register_node


@register_node
class ExtractFieldNode(BaseNode):
    type     = "extract_field"
    label    = "Extract Field"
    category = "Data"

    inputs  = [{"name": "data", "type": "JSON", "label": "Data"}]
    outputs = [{"name": "value", "type": "ANY", "label": "Value"}]
    config_schema = [
        {"name": "path", "type": "string", "label": "Field Path",
         "default": "key",
         "placeholder": "e.g.  key  or  nested.key  or  list.0"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        data = inputs.get("data")
        path = config.get("path", "")
        value = data
        for part in path.split("."):
            if part == "":
                continue
            if isinstance(value, dict):
                value = value.get(part)
            elif isinstance(value, list):
                try:
                    value = value[int(part)]
                except (IndexError, ValueError):
                    value = None
            else:
                value = None
        return {"value": value}
