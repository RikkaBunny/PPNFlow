from __future__ import annotations
import base64
from engine.providers.base_provider import BaseProvider


class OpenAIProvider(BaseProvider):
    def __init__(self, api_key: str, base_url: str | None = None) -> None:
        self._api_key = api_key
        self._base_url = base_url

    async def chat(
        self,
        model: str,
        messages: list[dict],
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> str:
        from openai import AsyncOpenAI
        kwargs: dict = {"api_key": self._api_key}
        if self._base_url:
            kwargs["base_url"] = self._base_url
        client = AsyncOpenAI(**kwargs)
        resp = await client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return resp.choices[0].message.content or ""

    @staticmethod
    def build_messages(
        prompt: str,
        system_prompt: str = "",
        image_path: str = "",
        image_b64: str = "",
    ) -> list[dict]:
        """Build OpenAI messages list with optional image."""
        msgs = []
        if system_prompt:
            msgs.append({"role": "system", "content": system_prompt})

        user_content: list = [{"type": "text", "text": prompt}]

        img_data = _load_image(image_path, image_b64)
        if img_data:
            user_content.append({
                "type": "image_url",
                "image_url": {"url": img_data},
            })

        msgs.append({"role": "user", "content": user_content})
        return msgs


def _load_image(path: str, b64: str) -> str:
    """Return a data URI for the image."""
    if b64 and b64.startswith("data:image"):
        return b64
    if path:
        with open(path, "rb") as f:
            data = base64.b64encode(f.read()).decode()
        return f"data:image/png;base64,{data}"
    return ""
