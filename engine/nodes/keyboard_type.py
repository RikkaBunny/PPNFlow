from engine.base_node import BaseNode, register_node


@register_node
class KeyboardTypeNode(BaseNode):
    type     = "keyboard_type"
    label    = "Keyboard Type"
    category = "Automation"
    volatile = True

    inputs  = [{"name": "text", "type": "STRING", "label": "Text", "optional": True}]
    outputs = [{"name": "success", "type": "BOOL", "label": "Success"}]
    config_schema = [
        {"name": "text",     "type": "string", "label": "Text (fallback)", "default": ""},
        {"name": "interval", "type": "float",  "label": "Interval (sec)",  "default": 0.05, "min": 0, "max": 1},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        try:
            import pyautogui
        except ImportError:
            return {"success": False}

        text = inputs.get("text") or config.get("text", "")
        interval = float(config.get("interval", 0.05))
        pyautogui.typewrite(str(text), interval=interval)
        return {"success": True}
