"""Image processing nodes — crop, resize, find template."""
import base64
import io
from engine.base_node import BaseNode, register_node


@register_node
class ImageCropNode(BaseNode):
    type     = "image_crop"
    label    = "Image Crop"
    category = "Image"

    inputs  = [
        {"name": "image", "type": "IMAGE",  "label": "Image"},
        {"name": "x",     "type": "INT",    "label": "X", "optional": True},
        {"name": "y",     "type": "INT",    "label": "Y", "optional": True},
    ]
    outputs = [
        {"name": "image",    "type": "IMAGE",  "label": "Cropped"},
        {"name": "img_path", "type": "STRING", "label": "File Path"},
    ]
    config_schema = [
        {"name": "x",      "type": "int", "label": "X",      "default": 0},
        {"name": "y",      "type": "int", "label": "Y",      "default": 0},
        {"name": "width",  "type": "int", "label": "Width",  "default": 200, "min": 1},
        {"name": "height", "type": "int", "label": "Height", "default": 200, "min": 1},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        from PIL import Image
        import tempfile

        img = self._load_image(inputs.get("image", ""))
        x = int(inputs.get("x") or config.get("x", 0))
        y = int(inputs.get("y") or config.get("y", 0))
        w = int(config.get("width", 200))
        h = int(config.get("height", 200))

        cropped = img.crop((x, y, x + w, y + h))
        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        cropped.save(tmp.name)
        tmp.close()

        preview = self._to_preview(cropped)
        return {"image": tmp.name, "img_path": tmp.name, "_preview_image": preview}

    def _load_image(self, path):
        from PIL import Image
        if isinstance(path, str) and path and not path.startswith("data:"):
            return Image.open(path).convert("RGB")
        raise RuntimeError("Valid image path required")

    def _to_preview(self, img, max_w=320):
        ratio = max_w / max(img.width, 1)
        img = img.resize((max_w, int(img.height * ratio)))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=70)
        return f"data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode()}"


@register_node
class ImageResizeNode(BaseNode):
    type     = "image_resize"
    label    = "Image Resize"
    category = "Image"

    inputs  = [{"name": "image", "type": "IMAGE", "label": "Image"}]
    outputs = [
        {"name": "image",    "type": "IMAGE",  "label": "Resized"},
        {"name": "img_path", "type": "STRING", "label": "File Path"},
    ]
    config_schema = [
        {"name": "width",  "type": "int", "label": "Width",  "default": 640, "min": 1, "max": 7680},
        {"name": "height", "type": "int", "label": "Height", "default": 480, "min": 1, "max": 4320},
        {"name": "keep_ratio", "type": "bool", "label": "Keep Aspect Ratio", "default": True},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        from PIL import Image
        import tempfile

        img = Image.open(inputs.get("image", "")).convert("RGB")
        w = int(config.get("width", 640))
        h = int(config.get("height", 480))
        keep = config.get("keep_ratio", True)

        if keep:
            img.thumbnail((w, h), Image.LANCZOS)
        else:
            img = img.resize((w, h), Image.LANCZOS)

        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        img.save(tmp.name)
        tmp.close()
        return {"image": tmp.name, "img_path": tmp.name}


@register_node
class ImageMatchNode(BaseNode):
    type     = "image_match"
    label    = "Image Match"
    category = "Image"
    volatile = True

    inputs  = [
        {"name": "image",    "type": "IMAGE", "label": "Source Image"},
        {"name": "template", "type": "IMAGE", "label": "Template"},
    ]
    outputs = [
        {"name": "found",      "type": "BOOL",  "label": "Found"},
        {"name": "x",          "type": "INT",   "label": "X"},
        {"name": "y",          "type": "INT",   "label": "Y"},
        {"name": "confidence", "type": "FLOAT", "label": "Confidence"},
    ]
    config_schema = [
        {"name": "threshold", "type": "float", "label": "Confidence Threshold", "default": 0.8, "min": 0, "max": 1},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        try:
            import cv2
            import numpy as np
        except ImportError:
            raise RuntimeError("opencv-python is required: pip install opencv-python")

        threshold = float(config.get("threshold", 0.8))
        source = cv2.imread(inputs.get("image", ""))
        template = cv2.imread(inputs.get("template", ""))

        if source is None or template is None:
            return {"found": False, "x": 0, "y": 0, "confidence": 0.0}

        result = cv2.matchTemplate(source, template, cv2.TM_CCOEFF_NORMED)
        _, max_val, _, max_loc = cv2.minMaxLoc(result)

        found = max_val >= threshold
        return {
            "found": found,
            "x": int(max_loc[0] + template.shape[1] // 2) if found else 0,
            "y": int(max_loc[1] + template.shape[0] // 2) if found else 0,
            "confidence": round(float(max_val), 4),
        }
