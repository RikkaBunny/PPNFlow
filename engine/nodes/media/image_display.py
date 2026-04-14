"""
Image Display node - accepts an image path or base64 and sends a preview event.
"""
import base64
import io
from engine.base_node import BaseNode, register_node


@register_node
class ImageDisplayNode(BaseNode):
    type     = "image_display"
    label    = "Image Display"
    category = "Output"
    volatile = True
    dependencies = {"Pillow": "PIL"}

    inputs  = [{"name": "image", "type": "IMAGE", "label": "Image"}]
    outputs = []
    config_schema = [
        {"name": "preview_size", "type": "int", "label": "Preview Width (px)", "default": 320, "min": 64, "max": 1920},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        image = inputs.get("image", "")
        preview_w = int(config.get("preview_size", 320))
        preview = ""

        if isinstance(image, str):
            if image.startswith("data:image"):
                preview = image
            elif image:
                preview = self._file_to_preview(image, preview_w)

        return {"_display_image": preview}

    def _file_to_preview(self, path: str, max_w: int) -> str:
        try:
            from PIL import Image
            img = Image.open(path).convert("RGB")
            ratio = max_w / img.width
            new_h = int(img.height * ratio)
            img = img.resize((max_w, new_h), Image.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=70)
            b64 = base64.b64encode(buf.getvalue()).decode()
            return f"data:image/jpeg;base64,{b64}"
        except Exception:
            return ""
