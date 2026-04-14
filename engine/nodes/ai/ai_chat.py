import os
from engine.base_node import BaseNode, register_node


# Default base URLs for local providers
_DEFAULT_URLS = {
    "ollama": "http://localhost:11434/v1",
    "lmstudio": "http://localhost:1234/v1",
}


@register_node
class AIChatNode(BaseNode):
    type     = "ai_chat"
    label    = "AI Chat"
    category = "AI"
    volatile = True  # LLM results shouldn't be cached between loop iterations

    inputs  = [
        {"name": "prompt",        "type": "STRING", "label": "Prompt"},
        {"name": "image",         "type": "IMAGE",  "label": "Image",         "optional": True},
        {"name": "system_prompt", "type": "STRING", "label": "System Prompt", "optional": True},
    ]
    outputs = [
        {"name": "response", "type": "STRING", "label": "Response"},
    ]
    config_schema = [
        {"name": "provider", "type": "select", "label": "Provider",
         "default": "openai",
         "options": ["openai", "anthropic", "ollama", "lmstudio", "custom"]},
        {"name": "api_key",  "type": "password", "label": "API Key", "default": ""},
        {"name": "base_url", "type": "string",   "label": "API Base URL", "default": "",
         "placeholder": "e.g. http://localhost:11434/v1"},
        {"name": "model",    "type": "string", "label": "Model",
         "default": "gpt-4o",
         "placeholder": "e.g. gpt-4o, minicpm-v, llama3"},
        {"name": "system_prompt", "type": "string", "label": "System Prompt (fallback)",
         "default": "", "multiline": True},
        {"name": "temperature",   "type": "float",  "label": "Temperature",
         "default": 0.7, "min": 0, "max": 2},
        {"name": "max_tokens",    "type": "int",    "label": "Max Tokens",
         "default": 4096, "min": 1, "max": 32768},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        provider_name = config.get("provider", "openai")
        model         = config.get("model", "gpt-4o")
        temperature   = float(config.get("temperature", 0.7))
        max_tokens    = int(config.get("max_tokens", 4096))
        system_prompt = inputs.get("system_prompt") or config.get("system_prompt", "")
        prompt        = inputs.get("prompt", "")
        image         = inputs.get("image", "")   # file path or base64 or ""
        base_url      = config.get("base_url", "")
        api_key       = config.get("api_key", "")

        if provider_name == "anthropic":
            from engine.providers.anthropic_provider import AnthropicProvider
            key = api_key or os.environ.get("ANTHROPIC_API_KEY", "")
            if not key:
                raise RuntimeError("Anthropic API key not set")
            provider = AnthropicProvider(key)
            messages = AnthropicProvider.build_messages(
                prompt=prompt,
                system_prompt=system_prompt,
                image_path=image if not image.startswith("data:") else "",
                image_b64=image if image.startswith("data:") else "",
            )
        else:
            # OpenAI-compatible: openai, ollama, lmstudio, custom
            from engine.providers.openai_provider import OpenAIProvider

            if provider_name == "openai":
                key = api_key or os.environ.get("OPENAI_API_KEY", "")
                if not key:
                    raise RuntimeError("OpenAI API key not set")
                url = base_url or None
            elif provider_name in ("ollama", "lmstudio"):
                key = api_key or "ollama"  # Ollama/LM Studio don't need real key
                url = base_url or _DEFAULT_URLS.get(provider_name)
            else:  # custom
                key = api_key or "no-key"
                url = base_url or None

            provider = OpenAIProvider(key, base_url=url)
            messages = OpenAIProvider.build_messages(
                prompt=prompt,
                system_prompt=system_prompt,
                image_path=image if image and not image.startswith("data:") else "",
                image_b64=image if image and image.startswith("data:") else "",
            )

        response = await provider.chat(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return {"response": response}
