from __future__ import annotations
from abc import ABC, abstractmethod


class BaseProvider(ABC):
    @abstractmethod
    async def chat(
        self,
        model: str,
        messages: list[dict],
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> str:
        """Send messages and return the text response."""
        ...
