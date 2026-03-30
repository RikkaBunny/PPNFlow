from engine.base_node import BaseNode, register_node


@register_node
class TextInputNode(BaseNode):
    type     = "text_input"
    label    = "Text Input"
    category = "Input"
    volatile = False

    inputs  = []
    outputs = [{"name": "text", "type": "STRING", "label": "Text"}]
    config_schema = [
        {"name": "value", "type": "string", "label": "Value", "default": "", "multiline": True},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        return {"text": config.get("value", "")}
