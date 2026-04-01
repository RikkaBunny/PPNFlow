"""
OCR node — extract text from an image.

Default engine: RapidOCR (pip install rapidocr, ~30MB, no binary needed)
Supports: rapidocr, pytesseract, easyocr, winocr
"""
from engine.base_node import BaseNode, register_node


@register_node
class OcrNode(BaseNode):
    type     = "ocr"
    label    = "OCR"
    category = "Image"
    volatile = True
    # Use the new unified rapidocr package (replaces rapidocr_onnxruntime)
    dependencies = {"rapidocr": "rapidocr"}

    inputs  = [{"name": "image", "type": "IMAGE", "label": "Image"}]
    outputs = [
        {"name": "text",   "type": "STRING", "label": "Text"},
        {"name": "blocks", "type": "JSON",   "label": "Blocks"},
    ]
    config_schema = [
        {"name": "engine", "type": "select", "label": "OCR Engine",
         "default": "rapidocr",
         "options": [
             {"value": "rapidocr",     "label": "RapidOCR (recommended)",
              "package": "rapidocr",
              "description": "~30MB, supports Chinese/English/Japanese/Korean, no binary needed"},
             {"value": "pytesseract",  "label": "Tesseract OCR",
              "package": "pytesseract",
              "description": "Requires Tesseract binary: https://github.com/UB-Mannheim/tesseract/wiki"},
             {"value": "easyocr",      "label": "EasyOCR",
              "package": "easyocr",
              "description": "Deep learning OCR, 80+ languages, ~200MB+PyTorch"},
             {"value": "winocr",       "label": "Windows OCR",
              "package": "winocr",
              "description": "Windows 10+ built-in, free, fast, requires language packs"},
         ]},
        {"name": "lang", "type": "string", "label": "Language",
         "default": "", "placeholder": "auto / eng / chi_sim / jpn"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        image_path = inputs.get("image", "")
        if not image_path or not isinstance(image_path, str):
            raise RuntimeError("Image input required")
        if image_path.startswith("data:"):
            image_path = self._b64_to_file(image_path)

        engine = config.get("engine", "rapidocr")
        lang = config.get("lang", "")

        if engine == "rapidocr":
            return self._run_rapidocr(image_path)
        elif engine == "pytesseract":
            return self._run_tesseract(image_path, lang or "eng")
        elif engine == "easyocr":
            return self._run_easyocr(image_path, lang or "en")
        elif engine == "winocr":
            return self._run_winocr(image_path, lang or "en")
        raise RuntimeError(f"Unknown OCR engine: {engine}")

    # ── RapidOCR (default) ───────────────────────────────────────
    # https://github.com/RapidAI/RapidOCR
    # pip install rapidocr

    def _run_rapidocr(self, path: str) -> dict:
        from rapidocr import RapidOCR
        ocr = RapidOCR()
        result = ocr(path)
        if not result or not result.txts:
            return {"text": "", "blocks": []}
        texts = []
        blocks = []
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
    # pip install pytesseract Pillow
    # + Tesseract binary: https://github.com/UB-Mannheim/tesseract/wiki

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

    # ── EasyOCR ──────────────────────────────────────────────────
    # pip install easyocr
    # https://github.com/JaidedAI/EasyOCR

    def _run_easyocr(self, path: str, lang: str) -> dict:
        try:
            import easyocr
        except ImportError:
            raise RuntimeError("Install: pip install easyocr")
        langs = [l.strip() for l in lang.split(",")]
        reader = easyocr.Reader(langs, gpu=False)
        results = reader.readtext(path)
        texts, blocks = [], []
        for bbox, text, conf in results:
            texts.append(text)
            blocks.append({"text": text, "x": int(bbox[0][0]), "y": int(bbox[0][1]),
                           "w": int(bbox[2][0] - bbox[0][0]), "h": int(bbox[2][1] - bbox[0][1]),
                           "conf": round(conf, 4)})
        return {"text": "\n".join(texts), "blocks": blocks}

    # ── Windows OCR ──────────────────────────────────────────────
    # pip install winocr
    # https://github.com/GitHub30/winocr

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
