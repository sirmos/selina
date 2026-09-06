"""
Base class every specialist agent extends. An agent's job is to turn an
event into a next action, using the provider for reasoning where needed
and the timeline store for anything that should be remembered.

handle() stays the structured, app-driven entry point (specific event
types like checkin_missed or cycle_logged). handle_message() is the newer,
conversational entry point used by the natural language router, for
whatever a woman actually types rather than a predefined event shape.
Every agent gets a working default here, subclasses can override for
richer behavior.
"""

from abc import ABC, abstractmethod

from providers.base import LLMProvider, CompletionRequest
from memory.timeline_store import TimelineStore

# Applied to every agent's conversational reply. Without this, a general
# purpose model defaults to essay-with-headers-and-tables mode, which is
# exactly wrong for a text message, this is what actually happened the
# first time this ran for real, see the Photon hackathon plan's own
# instruction to keep replies short with no technical formatting.
IMESSAGE_STYLE_GUIDE = (
    "Reply in plain text only, the way a real person texts. No markdown, "
    "no headers, no tables, no numbered or bulleted lists, no bold or "
    "italic formatting. Keep it short, two to four sentences unless the "
    "person clearly asked for more detail. One idea at a time, not "
    "everything you know about the topic."
)


class Agent(ABC):
    name: str = "base"
    domain_prompt: str = (
        "You are part of Selina, a support system for women. Reply warmly, "
        "clearly, and briefly."
    )

    def __init__(self, provider: LLMProvider, timeline: TimelineStore):
        self.provider = provider
        self.timeline = timeline

    @abstractmethod
    def handle(self, event: dict) -> dict:
        """Take a structured, app-driven event, return a next action as a
        dict with at least an "action" key. Agents should log anything
        worth remembering to self.timeline before returning."""
        raise NotImplementedError

    def handle_message(self, text: str) -> dict:
        """Take a free text message routed here by the natural language
        router, reply in this agent's voice. Default implementation, any
        agent needing more structured behavior in conversation mode can
        override this."""
        request = CompletionRequest(
            system_prompt=f"{self.domain_prompt}\n\n{IMESSAGE_STYLE_GUIDE}",
            user_prompt=text,
            tier="fast",
        )
        message = self.provider.complete(request)

        entry = self.timeline.add(
            agent=self.name,
            kind="message",
            summary=text[:80],
            data={"from_user": text, "reply": message},
        )

        return {
            "action": "reply",
            "message": message,
            "timeline_id": entry.id,
        }
