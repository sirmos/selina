"""
Fallback provider. Wraps a list of providers and tries them in order,
moving to the next the moment one fails for any reason: a retired model,
a rate limit, a network hiccup, an invalid key. This is what makes the
whole system resilient to any single free provider having a bad day,
which free tiers do, regularly.

MockProvider is always appended as the final link in the chain, guaranteed
never to throw, so complete() here never actually raises to the caller.
In the worst case, every real provider is down and the reply degrades to
a canned message, it never crashes the request.
"""

from .base import LLMProvider, CompletionRequest
from .mock_provider import MockProvider


class FallbackProvider(LLMProvider):
    def __init__(self, providers: list):
        """providers is a list of (name, LLMProvider instance) tuples, in
        the order they should be tried. MockProvider is appended
        automatically as the guaranteed last resort."""
        self.providers = list(providers) + [("mock", MockProvider())]
        self.last_used = None

    def complete(self, request: CompletionRequest) -> str:
        errors = []
        for name, provider in self.providers:
            try:
                result = provider.complete(request)
                self.last_used = name
                if name != self.providers[0][0]:
                    print(f"[FallbackProvider] used '{name}' after earlier failure(s): {errors}")
                return result
            except Exception as exc:  # noqa: BLE001, any provider can fail in different ways
                errors.append(f"{name}: {exc}")
                continue

        # Should never actually reach here since MockProvider cannot fail,
        # but never let this function raise silently if it somehow does.
        raise RuntimeError(f"All providers failed, including mock: {errors}")
