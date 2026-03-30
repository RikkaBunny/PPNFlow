from engine.base_node import BaseNode, register_node


@register_node
class KeyboardPressNode(BaseNode):
    type     = "keyboard_press"
    label    = "Keyboard Press"
    category = "Automation"
    volatile = True

    inputs  = [{"name": "key", "type": "STRING", "label": "Key", "optional": True}]
    outputs = [{"name": "success", "type": "BOOL", "label": "Success"}]
    config_schema = [
        {"name": "key", "type": "string", "label": "Key / Hotkey",
         "default": "enter",
         "placeholder": "e.g. enter, ctrl+c, alt+f4"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        try:
            import pyautogui
        except ImportError:
            return {"success": False}

        key = inputs.get("key") or config.get("key", "enter")
        # Support combos like "ctrl+c"
        parts = str(key).split("+")
        if len(parts) > 1:
            pyautogui.hotkey(*parts)
        else:
            pyautogui.press(parts[0])
        return {"success": True}
