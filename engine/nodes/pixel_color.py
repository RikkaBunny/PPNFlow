"""Pixel Color — get the color of a pixel at a screen coordinate."""
from engine.base_node import BaseNode, register_node


@register_node
class PixelColorNode(BaseNode):
    type     = "pixel_color"
    label    = "Pixel Color"
    category = "Input"
    volatile = True

    inputs  = [
        {"name": "x",     "type": "INT",   "label": "X", "optional": True},
        {"name": "y",     "type": "INT",   "label": "Y", "optional": True},
        {"name": "image", "type": "IMAGE", "label": "Image", "optional": True},
    ]
    outputs = [
        {"name": "r",     "type": "INT",    "label": "R"},
        {"name": "g",     "type": "INT",    "label": "G"},
        {"name": "b",     "type": "INT",    "label": "B"},
        {"name": "hex",   "type": "STRING", "label": "Hex"},
        {"name": "match", "type": "BOOL",   "label": "Match"},
    ]
    config_schema = [
        {"name": "x", "type": "int", "label": "X", "default": 0},
        {"name": "y", "type": "int", "label": "Y", "default": 0},
        {"name": "expect_hex", "type": "string", "label": "Expected Color (hex)", "default": "", "placeholder": "#FF0000"},
        {"name": "tolerance",  "type": "int",    "label": "Tolerance", "default": 10, "min": 0, "max": 255},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        x = int(inputs.get("x") or config.get("x", 0))
        y = int(inputs.get("y") or config.get("y", 0))
        image_path = inputs.get("image")

        if image_path and isinstance(image_path, str) and not image_path.startswith("data:"):
            r, g, b = self._from_image(image_path, x, y)
        else:
            r, g, b = self._from_screen(x, y)

        hex_color = f"#{r:02X}{g:02X}{b:02X}"
        match = self._check_match(r, g, b, config.get("expect_hex", ""), int(config.get("tolerance", 10)))
        return {"r": r, "g": g, "b": b, "hex": hex_color, "match": match}

    def _from_screen(self, x, y):
        try:
            import mss
            with mss.mss() as sct:
                px = sct.grab({"left": x, "top": y, "width": 1, "height": 1})
                return px.pixel(0, 0)[:3]  # BGR → RGB
        except Exception:
            try:
                import pyautogui
                from PIL import ImageGrab
                img = ImageGrab.grab(bbox=(x, y, x + 1, y + 1))
                return img.getpixel((0, 0))[:3]
            except Exception:
                return (0, 0, 0)

    def _from_image(self, path, x, y):
        from PIL import Image
        img = Image.open(path).convert("RGB")
        if 0 <= x < img.width and 0 <= y < img.height:
            return img.getpixel((x, y))
        return (0, 0, 0)

    def _check_match(self, r, g, b, expect_hex, tolerance):
        if not expect_hex:
            return True
        expect_hex = expect_hex.strip().lstrip("#")
        if len(expect_hex) != 6:
            return False
        er, eg, eb = int(expect_hex[0:2], 16), int(expect_hex[2:4], 16), int(expect_hex[4:6], 16)
        return abs(r - er) <= tolerance and abs(g - eg) <= tolerance and abs(b - eb) <= tolerance
