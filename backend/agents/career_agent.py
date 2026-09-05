"""
Career Agent. Tracks job applications logged over time and nudges a
follow up once enough time has passed without a response, the smallest
useful slice of career support.
"""

from datetime import datetime

from agents.base import Agent
from providers.base import CompletionRequest

CAREER_SYSTEM_PROMPT = (
    "You are the Career Agent inside Selina, a support system for women. "
    "You help track job applications and encourage without pressure, you "
    "never make the person feel behind."
)

FOLLOW_UP_AFTER_DAYS = 7


class CareerAgent(Agent):
    name = "career"
    domain_prompt = CAREER_SYSTEM_PROMPT

    def handle(self, event: dict) -> dict:
        event_type = event.get("type")

        if event_type == "application_logged":
            return self._handle_application_logged(event)
        if event_type == "application_status_check":
            return self._handle_status_check(event)

        raise ValueError(f"Career Agent does not know how to handle event type: {event_type}")

    def _handle_application_logged(self, event: dict) -> dict:
        company = event.get("company", "a company")
        role = event.get("role", "a role")

        entry = self.timeline.add(
            agent=self.name,
            kind="application_logged",
            summary=f"Applied to {role} at {company}",
            data={"company": company, "role": role, "applied_date": event.get("applied_date")},
        )

        return {
            "action": "log_application",
            "timeline_id": entry.id,
        }

    def _handle_status_check(self, event: dict) -> dict:
        applied_date_str = event.get("applied_date")
        days_since = None
        if applied_date_str:
            applied_date = datetime.fromisoformat(applied_date_str)
            days_since = (datetime.now().date() - applied_date.date()).days

        should_follow_up = days_since is not None and days_since >= FOLLOW_UP_AFTER_DAYS

        request = CompletionRequest(
            system_prompt=CAREER_SYSTEM_PROMPT,
            user_prompt=(
                f"It has been {days_since} days since an application with no response. "
                "Write one short, encouraging line, suggest a follow up only if it has "
                f"been {FOLLOW_UP_AFTER_DAYS} days or more."
            ),
            tier="fast",
        )
        message = self.provider.complete(request)

        entry = self.timeline.add(
            agent=self.name,
            kind="application_status_check",
            summary="Follow up suggested" if should_follow_up else "Still within normal wait time",
            data={"days_since": days_since, "message": message},
        )

        return {
            "action": "suggest_follow_up" if should_follow_up else "wait",
            "days_since": days_since,
            "message": message,
            "timeline_id": entry.id,
        }
