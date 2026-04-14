from engine.base_node import BaseNode, register_node


@register_node
class TemplateNode(BaseNode):
    type     = "template"
    label    = "Template"
    category = "Data"

    inputs  = [
        {"name": "data", "type": "JSON",   "label": "Data (JSON)",    "optional": True},
        {"name": "text", "type": "STRING", "label": "Extra Text",     "optional": True},
    ]
    outputs = [{"name": "result", "type": "STRING", "label": "Result"}]
    config_schema = [
        {"name": "template", "type": "string", "label": "Template",
         "default": "Hello {name}!",
         "multiline": True,
         "placeholder": "Use {key} for JSON fields, {text} for the text input"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        template = config.get("template", "")
        ctx: dict = {}
        data = inputs.get("data")
        if isinstance(data, dict):
            ctx.update(data)
        text = inputs.get("text")
        if text is not None:
            ctx["text"] = text

        result = template.format_map(ctx)
        return {"result": result}
