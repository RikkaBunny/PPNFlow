"""
Wait Feature — repeatedly screenshot + template match until found or timeout.
Core building block for game automation (replaces ok-script wait_until pattern).
"""
import time
from engine.base_node import BaseNode, register_node


@register_node
class WaitFeatureNode(BaseNode):
    type     = "wait_feature"
    label    = "Wait Feature"
    category = "Game"
    volatile = True
    dependencies = {"opencv-python": "cv2", "Pillow": "PIL", "mss": "mss"}

    inputs  = [
        {"name": "template", "type": "IMAGE",  "label": "Template Image"},
        {"name": "title",    "type": "STRING", "label": "Window Title", "optional": True},
    ]
    outputs = [
        {"name": "found",      "type": "BOOL",  "label": "Found"},
        {"name": "x",          "type": "INT",   "label": "X"},
        {"name": "y",          "type": "INT",   "label": "Y"},
        {"name": "confidence", "type": "FLOAT", "label": "Confidence"},
        {"name": "image",      "type": "IMAGE", "label": "Last Screenshot"},
    ]
    config_schema = [
        {"name": "window_title", "type": "string", "label": "Window Title",
         "default": "", "placeholder": "e.g. 鸣潮"},
        {"name": "capture_method", "type": "select", "label": "Capture Method",
         "default": "dxcam",
         "options": [
             {"value": "dxcam",  "label": "dxcam (DirectX)"},
             {"value": "wgc",   "label": "WGC (background)"},
             {"value": "bitblt","label": "BitBlt (GDI)"},
             {"value": "mss",   "label": "mss (screen region)"},
         ]},
        {"name": "threshold",  "type": "float", "label": "Confidence Threshold",
         "default": 0.8, "min": 0.1, "max": 1.0},
        {"name": "timeout",    "type": "float", "label": "Timeout (s)",
         "default": 10.0, "min": 1, "max": 300},
        {"name": "interval",   "type": "float", "label": "Check Interval (s)",
         "default": 0.5, "min": 0.1, "max": 5},
        {"name": "region_x",   "type": "float", "label": "Region X (0-1)", "default": 0},
        {"name": "region_y",   "type": "float", "label": "Region Y (0-1)", "default": 0},
        {"name": "region_w",   "type": "float", "label": "Region W (0-1)", "default": 1},
        {"name": "region_h",   "type": "float", "label": "Region H (0-1)", "default": 1},
        {"name": "template_ref_width", "type": "int", "label": "Template Ref Width",
         "default": 3840, "min": 0, "max": 7680},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        import cv2

        template_path = inputs.get("template", "")
        title = inputs.get("title") or config.get("window_title", "")
        threshold = float(config.get("threshold", 0.8))
        timeout = float(config.get("timeout", 10.0))
        interval = float(config.get("interval", 0.5))
        rx = float(config.get("region_x", 0))
        ry = float(config.get("region_y", 0))
        rw = float(config.get("region_w", 1))
        rh = float(config.get("region_h", 1))
        template_ref_width = int(config.get("template_ref_width", 3840))

        if not template_path:
            raise RuntimeError("Template image required")

        template = cv2.imread(template_path)
        if template is None:
            raise RuntimeError(f"Cannot read template: {template_path}")

        start = time.time()
        last_shot = None

        while time.time() - start < timeout:
            shot_path = await self._take_screenshot(title, config)
            last_shot = shot_path

            source = cv2.imread(shot_path)
            if source is None:
                time.sleep(interval)
                continue

            h, w = source.shape[:2]

            # Optional region crop
            if rx > 0 or ry > 0 or rw < 1 or rh < 1:
                x1 = int(w * rx)
                y1 = int(h * ry)
                x2 = int(w * (rx + rw))
                y2 = int(h * (ry + rh))
                region = source[y1:y2, x1:x2]
                offset_x, offset_y = x1, y1
            else:
                region = source
                offset_x, offset_y = 0, 0

            # Auto-scale template if resolution differs
            scaled_tpl = template
            if w > 0 and template_ref_width > 0 and abs(w / template_ref_width - 1.0) > 0.05:
                scale = w / template_ref_width
                new_tw = max(1, int(template.shape[1] * scale))
                new_th = max(1, int(template.shape[0] * scale))
                scaled_tpl = cv2.resize(template, (new_tw, new_th), interpolation=cv2.INTER_AREA)

            if region.shape[0] < scaled_tpl.shape[0] or region.shape[1] < scaled_tpl.shape[1]:
                time.sleep(interval)
                continue

            result = cv2.matchTemplate(region, scaled_tpl, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, max_loc = cv2.minMaxLoc(result)

            if max_val >= threshold:
                cx = int(max_loc[0] + scaled_tpl.shape[1] // 2 + offset_x)
                cy = int(max_loc[1] + scaled_tpl.shape[0] // 2 + offset_y)
                return {
                    "found": True,
                    "x": cx,
                    "y": cy,
                    "confidence": round(float(max_val), 4),
                    "image": shot_path,
                }

            time.sleep(interval)

        return {
            "found": False,
            "x": 0,
            "y": 0,
            "confidence": 0.0,
            "image": last_shot or "",
        }

    async def _take_screenshot(self, title: str, config: dict) -> str:
        """Delegate to WindowScreenshotNode for actual capture."""
        from engine.nodes.capture.window_screenshot import WindowScreenshotNode
        ss = WindowScreenshotNode()
        capture_method = config.get("capture_method", "dxcam")
        result = await ss.execute(
            {"title": title} if title else {},
            {
                "window_title": title,
                "capture_method": capture_method,
                "bring_to_front": capture_method == "dxcam",
                "preview_size": 64,  # Small preview, we only need the file
            },
        )
        return result["image"]
