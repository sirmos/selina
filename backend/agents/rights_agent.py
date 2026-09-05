"""
Rights and Support Agent. Backs the Rights & Support screen in the app,
a private case timeline for tracking what was agreed against what
actually happened, useful for domestic workers and anyone documenting a
dispute over time.
"""

from agents.base import Agent
from providers.base import CompletionRequest

RIGHTS_SYSTEM_PROMPT = (
    "You are the Rights and Support Agent inside Selina, a support system "
    "for women. You help someone document a situation clearly and calmly, "
    "you never tell them what to do next, you help them see their own "
    "record more clearly and decide for themselves."
)

# Keywords that bump a case entry to a higher priority for the person to
# review, not an automatic escalation, just a nudge to look closer.
URGENT_KEYWORDS = ["unpaid", "threatened", "locked", "confiscated", "unsafe", "refused to pay"]


class RightsAgent(Agent):
    name = "rights"
    domain_prompt = RIGHTS_SYSTEM_PROMPT

    def handle(self, event: dict) -> dict:
        if event.get("type") != "case_entry_added":
            raise ValueError(f"Rights Agent only handles type 'case_entry_added', got: {event.get('type')}")

        detail = event.get("detail", "")
        if not detail.strip():
            raise ValueError("Rights Agent received an empty case entry")

        flagged = any(word in detail.lower() for word in URGENT_KEYWORDS)

        request = CompletionRequest(
            system_prompt=RIGHTS_SYSTEM_PROMPT,
            user_prompt=f"The person logged this in their case: {detail}. Write one short, calm acknowledgment.",
            tier="fast",
        )
        message = self.provider.complete(request)

        entry = self.timeline.add(
            agent=self.name,
            kind="case_entry_added",
            summary=detail[:80],
            data={"detail": detail, "flagged": flagged, "message": message},
        )

        return {
            "action": "flag_for_review" if flagged else "add_to_case",
            "message": message,
            "timeline_id": entry.id,
        }
