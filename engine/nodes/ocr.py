"""
OCR node — extract text from an image.

Engine priority:
  1. ai       — uses GPT-4o / Claude vision (no extra install, best accuracy)
  2. winocr   — Windows 10+ built-in (no extra install on Windows)
  3. pytesseract / easyocr — traditional OCR (requires separate install)
"""
import os
import base64
from engine.base_node import BaseNode, register_node


def _detect_local_engines() -> list[str]:
    """Return list of locally installed OCR engines."""
    engines = []
    try:
        import winocr  # noqa: F401
        engines.append("winocr")
    except ImportError:
        pass
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
    return engines


def _image_to_b64(path: str) -> str:
    """Read image file and return base64 data URI."""
    with open(path, "rb") as f:
        data = base64.b64encode(f.read()).decode()
    ext = os.path.splitext(path)[1].lower()
    mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
            "gif": "image/gif", "webp": "image/webp", "bmp": "image/bmp"
            }.get(ext.lstrip("."), "image/png")
    return f"data:{mime};base64,{data}"


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
         "default": "auto",
         "options": ["auto", "ai", "winocr", "pytesseract", "easyocr"]},
        {"name": "lang", "type": "string", "label": "Language",
         "default": "eng",
         "placeholder": "eng, chi_sim, jpn"},
        {"name": "ai_provider", "type": "select", "label": "AI Provider (for AI engine)",
         "default": "openai", "options": ["openai", "anthropic"]},
        {"name": "ai_model", "type": "string", "label": "AI Model",
         "default": "gpt-4o-mini",
         "placeholder": "gpt-4o, claude-sonnet-4-20250514"},
        {"name": "openai_api_key", "type": "password", "label": "OpenAI Key", "default": ""},
        {"name": "anthropic_api_key", "type": "password", "label": "Anthropic Key", "default": ""},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        image_path = inputs.get("image", "")
        if not image_path or not isinstance(image_path, str):
            raise RuntimeError("Image input is required")

        engine = config.get("engine", "auto")
        lang = config.get("lang", "eng")

        # Auto: prefer AI (always available if API key set), then local engines
        if engine == "auto":
            api_key = self._get_api_key(config)
            if api_key:
                engine = "ai"
            else:
                local = _detect_local_engines()
                if local:
                    engine = local[0]
                else:
                    raise RuntimeError(
                        "No OCR engine available.\n\n"
                        "Option 1 (recommended): Set an OpenAI or Anthropic API key\n"
                        "  → uses AI vision for OCR, no extra install needed.\n\n"
                        "Option 2: pip install winocr  (Windows 10+ only)\n"
                        "Option 3: pip install pytesseract  (+ Tesseract binary)\n"
                        "Option 4: pip install easyocr"
                    )

        if engine == "ai":
            return await self._run_ai(image_path, lang, config)
        elif engine == "winocr":
            return await self._run_winocr(image_path, lang)
        elif engine == "pytesseract":
            return await self._run_tesseract(image_path, lang)
        elif engine == "easyocr":
            return await self._run_easyocr(image_path, lang)

        raise RuntimeError(f"Unknown engine: {engine}")

    def _get_api_key(self, config: dict) -> str:
        provider = config.get("ai_provider", "openai")
        if provider == "anthropic":
            return config.get("anthropic_api_key") or os.environ.get("ANTHROPIC_API_KEY", "")
        return config.get("openai_api_key") or os.environ.get("OPENAI_API_KEY", "")

    # ── AI OCR (GPT-4o / Claude vision) ──────────────────────────

    async def _run_ai(self, path: str, lang: str, config: dict) -> dict:
        provider = config.get("ai_provider", "openai")
        model = config.get("ai_model", "gpt-4o-mini")
        api_key = self._get_api_key(config)

        if not api_key:
            raise RuntimeError(
                f"AI OCR requires an API key.\n"
                f"Set '{provider}_api_key' in the node config or "
                f"set the {provider.upper()}_API_KEY environment variable."
            )

        lang_hint = {"eng": "English", "chi_sim": "Simplified Chinese",
                     "chi_tra": "Traditional Chinese", "jpn": "Japanese",
                     "kor": "Korean"}.get(lang, lang)

        prompt = (
            f"Extract ALL text from this image. The text is in {lang_hint}.\n"
            "Return ONLY the extracted text, nothing else. "
            "Preserve line breaks and formatting."
        )

        if provider == "anthropic":
            from engine.providers.anthropic_provider import AnthropicProvider
            p = AnthropicProvider(api_key)
            messages = AnthropicProvider.build_messages(
                prompt=prompt, image_path=path
            )
        else:
            from engine.providers.openai_provider import OpenAIProvider
            p = OpenAIProvider(api_key)
            messages = OpenAIProvider.build_messages(
                prompt=prompt, image_path=path
            )

        text = await p.chat(model=model, messages=messages, max_tokens=4096, temperature=0)
        return {"text": text.strip(), "blocks": []}

    # ── Windows built-in OCR ─────────────────────────────────────

    async def _run_winocr(self, path: str, lang: str) -> dict:
        try:
            import winocr
        except ImportError:
            raise RuntimeError("winocr not installed: pip install winocr")

        lang_map = {"eng": "en", "chi_sim": "zh-Hans", "chi_tra": "zh-Hant",
                     "jpn": "ja", "kor": "ko", "fra": "fr", "deu": "de"}
        win_lang = lang_map.get(lang, lang)

        result = await winocr.recognize_read(path, win_lang)
        lines = [line.text for line in result.lines]
        blocks = [{"text": l.text, "x": l.x, "y": l.y, "w": l.w, "h": l.h, "conf": 1.0}
                  for l in result.lines]
        return {"text": "\n".join(lines), "blocks": blocks}

    # ── Tesseract ────────────────────────────────────────────────

    async def _run_tesseract(self, path: str, lang: str) -> dict:
        try:
            import pytesseract
            from PIL import Image
        except ImportError:
            raise RuntimeError("pytesseract not installed: pip install pytesseract")

        try:
            img = Image.open(path)
            text = pytesseract.image_to_string(img, lang=lang)
        except Exception as e:
            if "tesseract" in str(e).lower():
                raise RuntimeError(
                    "Tesseract binary not found.\n"
                    "Download: https://github.com/UB-Mannheim/tesseract/wiki"
                )
            raise

        data = pytesseract.image_to_data(img, lang=lang, output_type=pytesseract.Output.DICT)
        blocks = [{"text": data["text"][i], "x": data["left"][i], "y": data["top"][i],
                    "w": data["width"][i], "h": data["height"][i], "conf": data["conf"][i]}
                  for i in range(len(data["text"])) if data["text"][i].strip()]
        return {"text": text.strip(), "blocks": blocks}

    # ── EasyOCR ──────────────────────────────────────────────────

    async def _run_easyocr(self, path: str, lang: str) -> dict:
        try:
            import easyocr
        except ImportError:
            raise RuntimeError("easyocr not installed: pip install easyocr")

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
