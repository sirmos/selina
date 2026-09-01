"""
Companion Agent. The one agent whose whole job is reasoning, not
structured logic, it powers the open ended chat flow in the app. Every
message routes through the provider, unlike Safety and Health which mostly
short circuit around it.
"""

from agents.base import Agent
from providers.base import CompletionRequest

COMPANION_SYSTEM_PROMPT = (
    "You are the Companion inside Selina, a support system for women. You "
    "are a calm, private space to talk, not a therapist and not a friend "
    "pretending to be human. You listen, reflect back what you're hearing, "
    "and ask at most one gentle question. You never rush the person, and "
    "you never suggest they should feel differently than they do."
)


class CompanionAgent(Agent):
    name = "companion"

    def handle(self, event: dict) -> dict:
        if event.get("type") != "message":
            raise ValueError(f"Companion Agent only handles type 'message', got: {event.get('type')}")

        text = event.get("text", "")
        if not text.strip():
            raise ValueError("Companion Agent received an empty message")

        request = CompletionRequest(
            system_prompt=COMPANION_SYSTEM_PROMPT,
            user_prompt=text,
            tier="deep",  # open ended conversation gets the stronger model
        )
        reply = self.provider.complete(request)

        entry = self.timeline.add(
            agent=self.name,
            kind="message",
            summary="Conversation exchange",
            data={"from_user": text, "reply": reply},
        )

        return {
            "action": "reply",
            "message": reply,
            "timeline_id": entry.id,
        }
