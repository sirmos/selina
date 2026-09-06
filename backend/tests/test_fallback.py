import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from providers.base import LLMProvider, CompletionRequest
from providers.fallback_provider import FallbackProvider


class AlwaysFailsProvider(LLMProvider):
    def __init__(self, error_message="simulated failure"):
        self.error_message = error_message
        self.was_called = False

    def complete(self, request: CompletionRequest) -> str:
        self.was_called = True
        raise RuntimeError(self.error_message)


class AlwaysWorksProvider(LLMProvider):
    def __init__(self, reply="real reply"):
        self.reply = reply
        self.was_called = False

    def complete(self, request: CompletionRequest) -> str:
        self.was_called = True
        return self.reply


def run():
    print("--- first provider fails, falls through to second ---")
    first = AlwaysFailsProvider("model retired")
    second = AlwaysWorksProvider("second provider's real reply")
    provider = FallbackProvider([("first", first), ("second", second)])

    result = provider.complete(CompletionRequest(system_prompt="s", user_prompt="u"))
    print("result:", result)
    print("last_used:", provider.last_used)
    assert first.was_called
    assert second.was_called
    assert result == "second provider's real reply"
    assert provider.last_used == "second"

    print("\n--- all real providers fail, degrades to mock rather than crashing ---")
    first = AlwaysFailsProvider("rate limited")
    second = AlwaysFailsProvider("invalid key")
    provider = FallbackProvider([("first", first), ("second", second)])

    result = provider.complete(CompletionRequest(system_prompt="s", user_prompt="hello"))
    print("result:", result)
    print("last_used:", provider.last_used)
    assert provider.last_used == "mock"
    assert "hello" in result  # MockProvider echoes the prompt back

    print("\n--- first provider works, second never even gets called ---")
    first = AlwaysWorksProvider("first provider's reply")
    second = AlwaysWorksProvider("should never be used")
    provider = FallbackProvider([("first", first), ("second", second)])

    result = provider.complete(CompletionRequest(system_prompt="s", user_prompt="u"))
    print("result:", result)
    assert first.was_called
    assert not second.was_called
    assert provider.last_used == "first"

    print("\nAll fallback assertions passed.")


if __name__ == "__main__":
    run()
