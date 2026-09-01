"""
Provider interface. Every agent talks to a provider through this interface
only, never to a specific vendor SDK directly. That is what lets the whole
backend run on MockProvider today and switch to NebiusProvider later by
changing one line in life_orchestrator.py, not by touching any agent.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class CompletionRequest:
    system_prompt: str
    user_prompt: str
    # "fast" routes to a small model (Nemotron Nano or Super on Nebius),
    # "deep" routes to a larger reasoning model (Nemotron Ultra). Mock and
    # test providers can ignore this, real providers should not.
    tier: str = "fast"


class LLMProvider(ABC):
    @abstractmethod
    def complete(self, request: CompletionRequest) -> str:
        """Return the model's reply as plain text."""
        raise NotImplementedError
