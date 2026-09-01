"""
A deterministic provider for local development and tests. No network call,
no API key, so the whole orchestrator and agent layer can be built and
proven correct before Nebius access exists. Replace with NebiusProvider in
life_orchestrator.py once that access is unblocked, nothing else changes.
"""

from .base import LLMProvider, CompletionRequest


class MockProvider(LLMProvider):
    def __init__(self):
        self.calls = []  # kept for tests to inspect what was asked

    def complete(self, request: CompletionRequest) -> str:
        self.calls.append(request)
        # A plain, predictable reply so tests can assert on it, real
        # reasoning happens once NebiusProvider is in place.
        return (
            f"[mock reply, tier={request.tier}] "
            f"acknowledged: {request.user_prompt[:80]}"
        )
