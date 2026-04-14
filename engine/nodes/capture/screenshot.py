"""
Screenshot node - captures a screen region or window.
Uses mss for fast capture (100+ fps).
Falls back to a placeholder if mss is not installed.
"""
import base64
import io
from engine.base_node import BaseNode, register_node


@register_node
class ScreenshotNode(BaseNode):
    type     = "screenshot"
    label    = "Screenshot"
    category = "Input"
    volatile = True  # never cache - always capture fresh
    dependencies = {"mss": "mss", "Pillow": "PIL"}

    inputs  = []
    outputs = [
        {"name": "image",    "type": "IMAGE",  "label": "Image"},
        {"name": "img_path", "type": "STRING", "label": "File Path"},
    ]
    config_schema = [
        {"name": "monitor",      "type": "int",    "label": "Monitor Index", "default": 0, "min": 0, "max": 8},
        {"name": "window_title", "type": "string", "label": "Window Title (optional)", "default": ""},
        {"name": "preview_size", "type": "int",    "label": "Preview Width (px)", "default": 320, "min": 64, "max": 1920},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        try:
            import mss
            import mss.tools
        except ImportError:
            return self._placeholder()

        monitor_idx = int(config.get("monitor", 0))
        preview_w = int(config.get("preview_size", 320))

        with mss.mss() as sct:
            monitors = sct.monitors
            idx = min(monitor_idx, len(monitors) - 1)
            monitor = monitors[idx]
            screenshot = sct.grab(monitor)

            # Save to temp file for inter-node passing
            import tempfile, os
            tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
            mss.tools.to_png(screenshot.rgb, screenshot.size, output=tmp.name)
            tmp.close()
            img_path = tmp.name

            # Build small base64 preview
            preview_b64 = self._make_preview(screenshot, preview_w)

        return {"image": img_path, "img_path": img_path, "_preview_image": preview_b64}

    def _make_preview(self, screenshot, max_w: int) -> str:
        try:
            from PIL import Image
            img = Image.frombytes("RGB", screenshot.size, screenshot.rgb)
            ratio = max_w / img.width
            new_h = int(img.height * ratio)
            img = img.resize((max_w, new_h), Image.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=70)
            b64 = base64.b64encode(buf.getvalue()).decode()
            return f"data:image/jpeg;base64,{b64}"
        except Exception:
            return ""

    def _placeholder(self) -> dict:
        """Return a small grey placeholder when mss is unavailable."""
        try:
            from PIL import Image, ImageDraw
            img = Image.new("RGB", (320, 200), color=(60, 60, 60))
            draw = ImageDraw.Draw(img)
            draw.text((80, 90), "mss not installed", fill=(200, 200, 200))
            buf = io.BytesIO()
            img.save(buf, format="JPEG")
            b64 = base64.b64encode(buf.getvalue()).decode()
            preview = f"data:image/jpeg;base64,{b64}"
        except Exception:
            preview = ""
        return {"image": "", "img_path": "", "_preview_image": preview}
