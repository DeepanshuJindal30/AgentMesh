"""Mock LLM + embedding providers (free/offline by default)."""

from __future__ import annotations

import hashlib
import math
import re
from abc import ABC, abstractmethod
from typing import Any


class EmbeddingProvider(ABC):
    @abstractmethod
    def embed(self, text: str) -> list[float]:
        raise NotImplementedError


class LLMProvider(ABC):
    @abstractmethod
    def complete(self, prompt: str, **kwargs: Any) -> str:
        raise NotImplementedError


class MockEmbeddingProvider(EmbeddingProvider):
    """Deterministic bag-of-words style embedding for local demos."""

    def __init__(self, dims: int = 64) -> None:
        self.dims = dims

    def embed(self, text: str) -> list[float]:
        tokens = re.findall(r"[a-z0-9]+", text.lower())
        vec = [0.0] * self.dims
        for token in tokens:
            digest = hashlib.sha256(token.encode()).digest()
            idx = digest[0] % self.dims
            sign = 1.0 if digest[1] % 2 == 0 else -1.0
            vec[idx] += sign
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]


class MockLLMProvider(LLMProvider):
    def complete(self, prompt: str, **kwargs: Any) -> str:
        _ = kwargs
        return (
            "Mock analysis: similar historical incidents suggest a regression after deploy. "
            "Investigate recent changes in the cited repository and validate timeout configs."
        )


def cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b, strict=False))


def get_embedding_provider() -> EmbeddingProvider:
    return MockEmbeddingProvider()


def get_llm_provider() -> LLMProvider:
    return MockLLMProvider()
