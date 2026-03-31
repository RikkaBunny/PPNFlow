"""
OCR node — extract text from an image.
Supports multiple engines, user picks from dropdown, auto-installs on demand.
"""
from engine.base_node import BaseNode, register_node


@register_node
class OcrNode(BaseNode):
    type     = "ocr"
    label    = "OCR"
    category = "Image"
    volatile = True

    inputs  = [{"name": "image", "type": "IMAGE", "label": "Image"}]
    outputs = [
        {"name": "text",   "type": "STRING", "label": "Text"},
        {"name": "blocks", "type": "JSON",   "label": "Blocks"},
    ]
    config_schema = [
        {"name": "engine", "type": "select", "label": "OCR Engine",
         "default": "rapidocr",
         "options": [
             {"value": "rapidocr",     "label": "RapidOCR (recommended)",  "package": "rapidocr_onnxruntime"},
             {"value": "pytesseract",  "label": "Tesseract",               "package": "pytesseract"},
             {"value": "easyocr",      "label": "EasyOCR",                 "package": "easyocr"},
             {"value": "winocr",       "label": "Windows OCR",             "package": "winocr"},
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

    def _run_rapidocr(self, path: str) -> dict:
        from rapidocr_onnxruntime import RapidOCR
        ocr = RapidOCR()
        result, _ = ocr(path)
        if not result:
            return {"text": "", "blocks": []}
        texts, blocks = [], []
        for bbox, text, conf in result:
            texts.append(text)
            x = int(min(p[0] for p in bbox))
            y = int(min(p[1] for p in bbox))
            w = int(max(p[0] for p in bbox)) - x
            h = int(max(p[1] for p in bbox)) - y
            blocks.append({"text": text, "x": x, "y": y, "w": w, "h": h, "conf": round(conf, 4)})
        return {"text": "\n".join(texts), "blocks": blocks}

    def _run_tesseract(self, path: str, lang: str) -> dict:
        import pytesseract
        from PIL import Image
        try:
            img = Image.open(path)
            text = pytesseract.image_to_string(img, lang=lang)
        except Exception as e:
            if "tesseract" in str(e).lower():
                raise RuntimeError("Tesseract binary not found.\nDownload: https://github.com/UB-Mannheim/tesseract/wiki")
            raise
        data = pytesseract.image_to_data(img, lang=lang, output_type=pytesseract.Output.DICT)
        blocks = [{"text": data["text"][i], "x": data["left"][i], "y": data["top"][i],
                    "w": data["width"][i], "h": data["height"][i], "conf": data["conf"][i]}
                  for i in range(len(data["text"])) if data["text"][i].strip()]
        return {"text": text.strip(), "blocks": blocks}

    def _run_easyocr(self, path: str, lang: str) -> dict:
        import easyocr
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

    def _run_winocr(self, path: str, lang: str) -> dict:
        import winocr, asyncio
        lang_map = {"eng": "en", "chi_sim": "zh-Hans", "chi_tra": "zh-Hant", "jpn": "ja", "kor": "ko"}
        result = asyncio.get_event_loop().run_until_complete(winocr.recognize_read(path, lang_map.get(lang, lang)))
        lines = [l.text for l in result.lines]
        blocks = [{"text": l.text, "x": l.x, "y": l.y, "w": l.w, "h": l.h, "conf": 1.0} for l in result.lines]
        return {"text": "\n".join(lines), "blocks": blocks}

    def _b64_to_file(self, b64: str) -> str:
        import base64, tempfile
        header, data = b64.split(",", 1)
        ext = ".png" if "png" in header else ".jpg"
        tmp = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
        tmp.write(base64.b64decode(data))
        tmp.close()
        return tmp.name
