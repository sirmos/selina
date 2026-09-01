"""
Academic Agent. Tracks deadlines and gives a simple urgency read on how
close one is, the smallest useful slice of academic support.
"""

from datetime import datetime

from agents.base import Agent
from providers.base import CompletionRequest

ACADEMIC_SYSTEM_PROMPT = (
    "You are the Academic Agent inside Selina, a support system for women. "
    "You help with deadlines and study planning, plainly and encouragingly, "
    "never guilt tripping about procrastination."
)


class AcademicAgent(Agent):
    name = "academic"

    def handle(self, event: dict) -> dict:
        if event.get("type") != "deadline_added":
            raise ValueError(f"Academic Agent only handles type 'deadline_added', got: {event.get('type')}")

        title = event.get("title", "an assignment")
        due_date_str = event.get("due_date")

        days_remaining = None
        if due_date_str:
            due_date = datetime.fromisoformat(due_date_str)
            days_remaining = (due_date.date() - datetime.now().date()).days

        request = CompletionRequest(
            system_prompt=ACADEMIC_SYSTEM_PROMPT,
            user_prompt=(
                f"A deadline was added: {title}, due in {days_remaining} days. "
                "Write one short, encouraging line, no guilt about timing."
            ),
            tier="fast",
        )
        message = self.provider.complete(request)

        urgent = days_remaining is not None and days_remaining <= 2

        entry = self.timeline.add(
            agent=self.name,
            kind="deadline_added",
            summary=f"{title}, due in {days_remaining} days",
            data={"title": title, "days_remaining": days_remaining, "message": message},
        )

        return {
            "action": "urgent_reminder" if urgent else "schedule_reminder",
            "days_remaining": days_remaining,
            "message": message,
            "timeline_id": entry.id,
        }
