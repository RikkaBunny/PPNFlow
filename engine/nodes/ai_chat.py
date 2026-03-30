import os
from engine.base_node import BaseNode, register_node


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
         "default": "openai", "options": ["openai", "anthropic"]},
        {"name": "model",    "type": "string", "label": "Model",
         "default": "gpt-4o",
         "placeholder": "e.g. gpt-4o, claude-opus-4-5"},
        {"name": "system_prompt", "type": "string", "label": "System Prompt (fallback)",
         "default": "", "multiline": True},
        {"name": "temperature",   "type": "float",  "label": "Temperature",
         "default": 0.7, "min": 0, "max": 2},
        {"name": "max_tokens",    "type": "int",    "label": "Max Tokens",
         "default": 4096, "min": 1, "max": 32768},
        # API keys - read from config or environment
        {"name": "openai_api_key",    "type": "password", "label": "OpenAI API Key",    "default": ""},
        {"name": "anthropic_api_key", "type": "password", "label": "Anthropic API Key", "default": ""},
    ]

    async def execute(self, inputs: dict, config: dict) -> dict:
        provider_name = config.get("provider", "openai")
        model         = config.get("model", "gpt-4o")
        temperature   = float(config.get("temperature", 0.7))
        max_tokens    = int(config.get("max_tokens", 4096))
        system_prompt = inputs.get("system_prompt") or config.get("system_prompt", "")
        prompt        = inputs.get("prompt", "")
        image         = inputs.get("image", "")   # file path or base64 or ""

        if provider_name == "openai":
            from engine.providers.openai_provider import OpenAIProvider
            api_key = (config.get("openai_api_key") or
                       os.environ.get("OPENAI_API_KEY", ""))
            if not api_key:
                raise RuntimeError("OpenAI API key not set")
            provider = OpenAIProvider(api_key)
            messages = OpenAIProvider.build_messages(
                prompt=prompt,
                system_prompt=system_prompt,
                image_path=image if not image.startswith("data:") else "",
                image_b64=image if image.startswith("data:") else "",
            )
        elif provider_name == "anthropic":
            from engine.providers.anthropic_provider import AnthropicProvider
            api_key = (config.get("anthropic_api_key") or
                       os.environ.get("ANTHROPIC_API_KEY", ""))
            if not api_key:
                raise RuntimeError("Anthropic API key not set")
            provider = AnthropicProvider(api_key)
            messages = AnthropicProvider.build_messages(
                prompt=prompt,
                system_prompt=system_prompt,
                image_path=image if not image.startswith("data:") else "",
                image_b64=image if image.startswith("data:") else "",
            )
        else:
            raise RuntimeError(f"Unknown AI provider: {provider_name!r}")

        response = await provider.chat(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return {"response": response}
