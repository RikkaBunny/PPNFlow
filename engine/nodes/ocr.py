"""OCR node — extract text from an image using pytesseract or easyocr."""
from engine.base_node import BaseNode, register_node


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
        {"name": "engine", "type": "select", "label": "Engine",   "default": "pytesseract", "options": ["pytesseract", "easyocr"]},
        {"name": "lang",   "type": "string", "label": "Language", "default": "eng", "placeholder": "eng, chi_sim, jpn"},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        image_path = inputs.get("image", "")
        engine = config.get("engine", "pytesseract")
        lang = config.get("lang", "eng")

        if engine == "easyocr":
            return await self._run_easyocr(image_path, lang)
        return await self._run_tesseract(image_path, lang)

    async def _run_tesseract(self, path: str, lang: str) -> dict:
        try:
            import pytesseract
            from PIL import Image
        except ImportError:
            raise RuntimeError("pytesseract required: pip install pytesseract")
        img = Image.open(path)
        text = pytesseract.image_to_string(img, lang=lang)
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
        try:
            import easyocr
        except ImportError:
            raise RuntimeError("easyocr required: pip install easyocr")
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
