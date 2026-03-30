from __future__ import annotations
import base64
from engine.providers.base_provider import BaseProvider


class AnthropicProvider(BaseProvider):
    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    async def chat(
        self,
        model: str,
        messages: list[dict],
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> str:
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=self._api_key)
        # Separate system message from user messages
        system = ""
        filtered = []
        for msg in messages:
            if msg["role"] == "system":
                system = msg["content"] if isinstance(msg["content"], str) else ""
            else:
                filtered.append(msg)

        kwargs = dict(
            model=model,
            max_tokens=max_tokens,
            messages=filtered,
        )
        if system:
            kwargs["system"] = system

        resp = await client.messages.create(**kwargs)
        return resp.content[0].text

    @staticmethod
    def build_messages(
        prompt: str,
        system_prompt: str = "",
        image_path: str = "",
        image_b64: str = "",
    ) -> list[dict]:
        msgs = []
        if system_prompt:
            msgs.append({"role": "system", "content": system_prompt})

        user_content: list = []
        img_data, media_type = _load_image(image_path, image_b64)
        if img_data:
            user_content.append({
                "type": "image",
                "source": {"type": "base64", "media_type": media_type, "data": img_data},
            })
        user_content.append({"type": "text", "text": prompt})
        msgs.append({"role": "user", "content": user_content})
        return msgs


def _load_image(path: str, b64: str) -> tuple[str, str]:
    """Returns (base64_data, media_type)."""
    if b64:
        if b64.startswith("data:image/"):
            header, data = b64.split(",", 1)
            mt = header.split(";")[0].replace("data:", "")
            return data, mt
    if path:
        with open(path, "rb") as f:
            data = base64.b64encode(f.read()).decode()
        return data, "image/png"
    return "", "image/png"
