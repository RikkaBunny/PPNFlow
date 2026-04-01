"""
OCR node — extract text from an image.

Optimizations:
- Engine instances cached (RapidOCR/EasyOCR model load only once)
- Optional image preprocessing (grayscale, binarize, contrast)
- Region crop support (x,y,w,h) for partial-screen OCR
- Overall confidence score output
- Temp file cleanup for base64 inputs
"""
import os
from engine.base_node import BaseNode, register_node

# ── Cached engine instances (heavy to initialize) ────────────────
_rapidocr_instance = None
_easyocr_readers: dict[str, object] = {}  # lang_key → Reader


def _get_rapidocr():
    global _rapidocr_instance
    if _rapidocr_instance is None:
        from rapidocr import RapidOCR
        _rapidocr_instance = RapidOCR()
    return _rapidocr_instance


def _get_easyocr_reader(langs: list[str]):
    key = ",".join(sorted(langs))
    if key not in _easyocr_readers:
        import easyocr
        _easyocr_readers[key] = easyocr.Reader(langs, gpu=False)
    return _easyocr_readers[key]


@register_node
class OcrNode(BaseNode):
    type     = "ocr"
    label    = "OCR"
    category = "Image"
    volatile = True
    dependencies = {"rapidocr": "rapidocr"}

    inputs  = [
        {"name": "image", "type": "IMAGE",  "label": "Image"},
        {"name": "x",     "type": "INT",    "label": "X",      "optional": True},
        {"name": "y",     "type": "INT",    "label": "Y",      "optional": True},
        {"name": "w",     "type": "INT",    "label": "Width",  "optional": True},
        {"name": "h",     "type": "INT",    "label": "Height", "optional": True},
    ]
    outputs = [
        {"name": "text",       "type": "STRING", "label": "Text"},
        {"name": "blocks",     "type": "JSON",   "label": "Blocks"},
        {"name": "confidence", "type": "FLOAT",  "label": "Confidence"},
        {"name": "count",      "type": "INT",    "label": "Block Count"},
    ]
    config_schema = [
        {"name": "engine", "type": "select", "label": "OCR Engine",
         "default": "rapidocr",
         "options": [
             {"value": "rapidocr",    "label": "RapidOCR (recommended)",
              "package": "rapidocr",
              "description": "~30MB, Chinese/English/Japanese/Korean, no binary needed"},
             {"value": "pytesseract", "label": "Tesseract OCR",
              "package": "pytesseract",
              "description": "Requires Tesseract binary: https://github.com/UB-Mannheim/tesseract/wiki"},
             {"value": "easyocr",     "label": "EasyOCR",
              "package": "easyocr",
              "description": "80+ languages, ~200MB + PyTorch"},
             {"value": "winocr",      "label": "Windows OCR",
              "package": "winocr",
              "description": "Windows 10+ built-in, fast, free"},
         ]},
        {"name": "lang", "type": "string", "label": "Language",
         "default": "", "placeholder": "auto / eng / chi_sim / jpn"},
        {"name": "preprocess", "type": "select", "label": "Preprocessing",
         "default": "none",
         "options": ["none", "grayscale", "binarize", "contrast"]},
        {"name": "crop_region", "type": "bool", "label": "Crop Region from Inputs",
         "default": False},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        image_path = inputs.get("image", "")
        if not image_path or not isinstance(image_path, str):
            raise RuntimeError("Image input required")

        is_b64 = image_path.startswith("data:")
        if is_b64:
            image_path = self._b64_to_file(image_path)

        try:
            # Optional region crop
            if config.get("crop_region"):
                cx = int(inputs.get("x") or 0)
                cy = int(inputs.get("y") or 0)
                cw = int(inputs.get("w") or 0)
                ch = int(inputs.get("h") or 0)
                if cw > 0 and ch > 0:
                    image_path = self._crop(image_path, cx, cy, cw, ch)

            # Optional preprocessing
            preprocess = config.get("preprocess", "none")
            if preprocess != "none":
                image_path = self._preprocess(image_path, preprocess)

            engine = config.get("engine", "rapidocr")
            lang = config.get("lang", "")

            if engine == "rapidocr":
                result = self._run_rapidocr(image_path)
            elif engine == "pytesseract":
                result = self._run_tesseract(image_path, lang or "eng")
            elif engine == "easyocr":
                result = self._run_easyocr(image_path, lang or "en")
            elif engine == "winocr":
                result = self._run_winocr(image_path, lang or "en")
            else:
                raise RuntimeError(f"Unknown OCR engine: {engine}")

            # Compute overall confidence
            blocks = result.get("blocks", [])
            if blocks:
                confs = [b.get("conf", 0) for b in blocks if isinstance(b.get("conf"), (int, float))]
                avg_conf = round(sum(confs) / len(confs), 4) if confs else 0
            else:
                avg_conf = 0

            result["confidence"] = avg_conf
            result["count"] = len(blocks)
            return result
        finally:
            # Cleanup temp files
            if is_b64 and os.path.exists(image_path):
                try:
                    os.unlink(image_path)
                except OSError:
                    pass

    # ── Preprocessing ────────────────────────────────────────────

    def _preprocess(self, path: str, mode: str) -> str:
        from PIL import Image, ImageEnhance, ImageFilter
        import tempfile
        img = Image.open(path)

        if mode == "grayscale":
            img = img.convert("L")
        elif mode == "binarize":
            img = img.convert("L")
            threshold = 128
            img = img.point(lambda p: 255 if p > threshold else 0, "1")
        elif mode == "contrast":
            img = ImageEnhance.Contrast(img).enhance(2.0)
            img = ImageEnhance.Sharpness(img).enhance(1.5)

        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        img.save(tmp.name)
        tmp.close()
        return tmp.name

    def _crop(self, path: str, x: int, y: int, w: int, h: int) -> str:
        from PIL import Image
        import tempfile
        img = Image.open(path)
        cropped = img.crop((x, y, x + w, y + h))
        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        cropped.save(tmp.name)
        tmp.close()
        return tmp.name

    # ── RapidOCR (cached instance) ───────────────────────────────

    def _run_rapidocr(self, path: str) -> dict:
        ocr = _get_rapidocr()
        result = ocr(path)
        if not result or not result.txts:
            return {"text": "", "blocks": []}
        texts, blocks = [], []
        for box, text, conf in zip(result.boxes, result.txts, result.scores):
            texts.append(text)
            x = int(min(p[0] for p in box))
            y = int(min(p[1] for p in box))
            w = int(max(p[0] for p in box)) - x
            h = int(max(p[1] for p in box)) - y
            blocks.append({"text": text, "x": x, "y": y, "w": w, "h": h,
                           "conf": round(float(conf), 4)})
        return {"text": "\n".join(texts), "blocks": blocks}

    # ── Tesseract ────────────────────────────────────────────────

    def _run_tesseract(self, path: str, lang: str) -> dict:
        try:
            import pytesseract
            from PIL import Image
        except ImportError:
            raise RuntimeError(
                "Install: pip install pytesseract Pillow\n"
                "Also need Tesseract binary:\n"
                "  https://github.com/UB-Mannheim/tesseract/wiki"
            )
        try:
            img = Image.open(path)
            text = pytesseract.image_to_string(img, lang=lang)
        except Exception as e:
            if "tesseract" in str(e).lower():
                raise RuntimeError(
                    "Tesseract binary not found.\n\n"
                    "Download installer:\n"
                    "  https://github.com/UB-Mannheim/tesseract/wiki\n\n"
                    "After install, add to PATH or set:\n"
                    "  pytesseract.pytesseract.tesseract_cmd = "
                    "r'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'"
                )
            raise
        data = pytesseract.image_to_data(img, lang=lang, output_type=pytesseract.Output.DICT)
        blocks = [{"text": data["text"][i], "x": data["left"][i], "y": data["top"][i],
                    "w": data["width"][i], "h": data["height"][i], "conf": data["conf"][i]}
                  for i in range(len(data["text"])) if data["text"][i].strip()]
        return {"text": text.strip(), "blocks": blocks}

    # ── EasyOCR (cached reader) ──────────────────────────────────

    def _run_easyocr(self, path: str, lang: str) -> dict:
        try:
            import easyocr  # noqa
        except ImportError:
            raise RuntimeError("Install: pip install easyocr")
        langs = [l.strip() for l in lang.split(",")]
        reader = _get_easyocr_reader(langs)
        results = reader.readtext(path)
        texts, blocks = [], []
        for bbox, text, conf in results:
            texts.append(text)
            blocks.append({"text": text, "x": int(bbox[0][0]), "y": int(bbox[0][1]),
                           "w": int(bbox[2][0] - bbox[0][0]), "h": int(bbox[2][1] - bbox[0][1]),
                           "conf": round(conf, 4)})
        return {"text": "\n".join(texts), "blocks": blocks}

    # ── Windows OCR ──────────────────────────────────────────────

    def _run_winocr(self, path: str, lang: str) -> dict:
        try:
            import winocr
            import asyncio
        except ImportError:
            raise RuntimeError(
                "Install: pip install winocr\n"
                "Windows 10+ only.\n"
                "Install language packs (PowerShell Admin):\n"
                '  Add-WindowsCapability -Online -Name "Language.OCR~~~en-US~0.0.1.0"'
            )
        lang_map = {"eng": "en", "chi_sim": "zh-Hans", "chi_tra": "zh-Hant",
                     "jpn": "ja", "kor": "ko", "fra": "fr", "deu": "de"}
        win_lang = lang_map.get(lang, lang)
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    result = pool.submit(
                        lambda: asyncio.run(winocr.recognize_read(path, win_lang))
                    ).result()
            else:
                result = loop.run_until_complete(winocr.recognize_read(path, win_lang))
        except Exception as e:
            raise RuntimeError(f"Windows OCR failed: {e}")
        lines = [l.text for l in result.lines]
        blocks = [{"text": l.text, "x": l.x, "y": l.y, "w": l.w, "h": l.h, "conf": 1.0}
                  for l in result.lines]
        return {"text": "\n".join(lines), "blocks": blocks}

    # ── Util ─────────────────────────────────────────────────────

    def _b64_to_file(self, b64: str) -> str:
        import base64, tempfile
        header, data = b64.split(",", 1)
        ext = ".png" if "png" in header else ".jpg"
        tmp = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
        tmp.write(base64.b64decode(data))
        tmp.close()
        return tmp.name
