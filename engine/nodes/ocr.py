"""
OCR node — extract text from an image.
Auto-detects available engine: pytesseract, easyocr, or Windows built-in.
"""
from engine.base_node import BaseNode, register_node


def _detect_engines() -> list[str]:
    """Return list of available OCR engines."""
    engines = []
    try:
        import pytesseract  # noqa: F401
        engines.append("pytesseract")
    except ImportError:
        pass
    try:
        import easyocr  # noqa: F401
        engines.append("easyocr")
    except ImportError:
        pass
    # Windows OCR via winocr
    try:
        import winocr  # noqa: F401
        engines.append("winocr")
    except ImportError:
        pass
    return engines


@register_node
class OcrNode(BaseNode):
    type     = "ocr"
    label    = "OCR (Text Recognition)"
    category = "Image"
    volatile = True

    inputs  = [{"name": "image", "type": "IMAGE", "label": "Image"}]
    outputs = [
        {"name": "text",   "type": "STRING", "label": "Text"},
        {"name": "blocks", "type": "JSON",   "label": "Blocks"},
    ]
    config_schema = [
        {"name": "engine", "type": "select", "label": "Engine",
         "default": "auto", "options": ["auto", "pytesseract", "easyocr", "winocr"]},
        {"name": "lang", "type": "string", "label": "Language",
         "default": "eng", "placeholder": "eng, chi_sim, jpn"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        image_path = inputs.get("image", "")
        if not image_path or (isinstance(image_path, str) and image_path.startswith("data:")):
            raise RuntimeError("OCR requires a file path as input, not base64")

        engine = config.get("engine", "auto")
        lang = config.get("lang", "eng")
        available = _detect_engines()

        # Auto-select best available engine
        if engine == "auto":
            if not available:
                raise RuntimeError(
                    "No OCR engine found. Install one of:\n"
                    "  pip install pytesseract   (+ Tesseract binary)\n"
                    "  pip install easyocr\n"
                    "  pip install winocr        (Windows 10+ only)"
                )
            engine = available[0]

        if engine not in available:
            raise RuntimeError(
                f"OCR engine '{engine}' is not installed.\n"
                f"Available engines: {available or 'none'}\n"
                f"Install with: pip install {engine}"
            )

        if engine == "pytesseract":
            return await self._run_tesseract(image_path, lang)
        elif engine == "easyocr":
            return await self._run_easyocr(image_path, lang)
        elif engine == "winocr":
            return await self._run_winocr(image_path, lang)

        raise RuntimeError(f"Unknown OCR engine: {engine}")

    async def _run_tesseract(self, path: str, lang: str) -> dict:
        import pytesseract
        from PIL import Image

        try:
            img = Image.open(path)
            text = pytesseract.image_to_string(img, lang=lang)
        except pytesseract.TesseractNotFoundError:
            raise RuntimeError(
                "Tesseract binary not found.\n"
                "Download from: https://github.com/UB-Mannheim/tesseract/wiki\n"
                "After install, add to PATH or set pytesseract.pytesseract.tesseract_cmd"
            )

        data = pytesseract.image_to_data(img, lang=lang, output_type=pytesseract.Output.DICT)
        blocks = []
        for i in range(len(data["text"])):
            if data["text"][i].strip():
                blocks.append({
                    "text": data["text"][i],
                    "x": data["left"][i], "y": data["top"][i],
                    "w": data["width"][i], "h": data["height"][i],
                    "conf": data["conf"][i],
                })
        return {"text": text.strip(), "blocks": blocks}

    async def _run_easyocr(self, path: str, lang: str) -> dict:
        import easyocr

        langs = [l.strip() for l in lang.split(",")]
        reader = easyocr.Reader(langs, gpu=False)
        results = reader.readtext(path)
        texts = []
        blocks = []
        for bbox, text, conf in results:
            texts.append(text)
            blocks.append({
                "text": text,
                "x": int(bbox[0][0]), "y": int(bbox[0][1]),
                "w": int(bbox[2][0] - bbox[0][0]),
                "h": int(bbox[2][1] - bbox[0][1]),
                "conf": round(conf, 4),
            })
        return {"text": "\n".join(texts), "blocks": blocks}

    async def _run_winocr(self, path: str, lang: str) -> dict:
        import winocr
        import asyncio

        # winocr uses Windows OCR API, lang format is like "en", "zh-Hans"
        lang_map = {"eng": "en", "chi_sim": "zh-Hans", "chi_tra": "zh-Hant",
                     "jpn": "ja", "kor": "ko", "fra": "fr", "deu": "de", "spa": "es"}
        win_lang = lang_map.get(lang, lang)

        result = await winocr.recognize_read(path, win_lang)
        lines = [line.text for line in result.lines]
        blocks = []
        for line in result.lines:
            blocks.append({
                "text": line.text,
                "x": line.x, "y": line.y,
                "w": line.w, "h": line.h,
                "conf": 1.0,
            })
        return {"text": "\n".join(lines), "blocks": blocks}
