"""
Companion Agent. The one agent whose whole job is reasoning, not
structured logic, it powers the open ended chat flow in the app. Every
message routes through the provider, unlike Safety and Health which mostly
short circuit around it.
"""

from agents.base import Agent, IMESSAGE_STYLE_GUIDE
from providers.base import CompletionRequest

COMPANION_SYSTEM_PROMPT = (
    "You are the Companion inside Selina, a warm, steady presence for women to talk to. "
    "You are not a therapist and not pretending to be human, but you genuinely care, and it "
    "should come through naturally, not clinically. Vary how you open your replies, never "
    "start with the same phrase twice in a row, and avoid clinical-sounding openers like "
    "'It sounds like...' every single time. "
    "If she is venting or working through a feeling, mostly listen and validate in your own "
    "words, briefly. Ask at most one question, only when it would genuinely help, and never "
    "stack more than one question in a single reply. "
    "If she directly asks for advice, ideas, or what she should do next, actually give her "
    "one or two concrete, grounded suggestions in a caring tone. Do not deflect a direct "
    "request for help back into another question, that reads as unhelpful and cold."
)


class CompanionAgent(Agent):
    name = "companion"
    domain_prompt = COMPANION_SYSTEM_PROMPT

    def handle(self, event: dict) -> dict:
        if event.get("type") != "message":
            raise ValueError(f"Companion Agent only handles type 'message', got: {event.get('type')}")

        text = event.get("text", "")
        if not text.strip():
            raise ValueError("Companion Agent received an empty message")

        request = CompletionRequest(
            system_prompt=f"{COMPANION_SYSTEM_PROMPT}\n\n{IMESSAGE_STYLE_GUIDE}",
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
