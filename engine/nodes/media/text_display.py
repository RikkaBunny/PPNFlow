from engine.base_node import BaseNode, register_node


@register_node
class TextDisplayNode(BaseNode):
    type     = "text_display"
    label    = "Text Display"
    category = "Output"
    volatile = True  # always re-runs so UI updates

    inputs  = [{"name": "text", "type": "STRING", "label": "Text"}]
    outputs = []
    config_schema = []

    async def execute(self, inputs: dict, config: dict) -> dict:
        text = inputs.get("text", "")
        # The frontend will display the last_value from node_output event
        return {"_display": text}
