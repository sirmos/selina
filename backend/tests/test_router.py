import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from providers.base import LLMProvider, CompletionRequest
from providers.mock_provider import MockProvider
from orchestrator.life_orchestrator import LifeOrchestrator


class ScriptedProvider(LLMProvider):
    """Returns pre-set replies in order, used to prove the router's parsing
    and multi-agent dispatch logic works correctly, independent of whether
    a real model is available. This is not a stand in for real reasoning
    quality, only for the mechanism around it."""

    def __init__(self, scripted_replies):
        self.scripted_replies = list(scripted_replies)
        self.calls = []

    def complete(self, request: CompletionRequest) -> str:
        self.calls.append(request)
        return self.scripted_replies.pop(0)


def run():
    print("--- MockProvider fallback, honest degrade, no real classification ---")
    mock = MockProvider()
    orchestrator = LifeOrchestrator(mock)
    result = orchestrator.handle_message("My boss has not paid me for two months.")
    print(result)
    assert result["agents_involved"] == ["companion"]  # correct fallback, Mock's
    # reply text can't parse into real agent names, so it degrades to
    # companion rather than silently failing or guessing wrong.

    print("\n--- Scripted provider, single agent ---")
    scripted = ScriptedProvider(["safety", "Stay near people you trust, and let me know if anything changes."])
    orchestrator = LifeOrchestrator(scripted)
    result = orchestrator.handle_message("I don't feel safe in this taxi.")
    print(result)
    assert result["agents_involved"] == ["safety"]
    assert result["action"] == "reply"

    print("\n--- Scripted provider, multi agent (the doc's core example) ---")
    scripted = ScriptedProvider([
        "welfare, financial, rights",  # router's classification
        "That's two months of missed pay, worth tracking exactly what you're owed.",  # welfare's reply
        "Let's look at what this means for your budget in the meantime.",  # financial's reply
        "This may be worth documenting in case you need it later.",  # rights' reply
    ])
    orchestrator = LifeOrchestrator(scripted)
    result = orchestrator.handle_message("My boss has not paid me for two months.")
    print(result)
    assert set(result["agents_involved"]) == {"welfare", "financial", "rights"}
    assert "months of missed pay" in result["message"]
    assert "budget" in result["message"]
    assert "documenting" in result["message"]

    print("\n--- Scripted provider, nonsense reply falls back to companion ---")
    scripted = ScriptedProvider(["I have no idea what you mean", "I'm here, tell me more."])
    orchestrator = LifeOrchestrator(scripted)
    result = orchestrator.handle_message("something vague")
    print(result)
    assert result["agents_involved"] == ["companion"]

    print("\n--- Empty message correctly raises ---")
    orchestrator = LifeOrchestrator(MockProvider())
    try:
        orchestrator.handle_message("   ")
        raise AssertionError("expected a ValueError for an empty message")
    except ValueError as exc:
        print("correctly raised:", exc)

    print("\nAll router assertions passed.")


if __name__ == "__main__":
    run()
