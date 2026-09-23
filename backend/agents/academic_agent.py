"""
Academic Agent. Tracks deadlines and gives a simple urgency read on how
close one is, plus open-ended conversational support: explaining
concepts, generating practice questions, and walking through problems.
"""

from datetime import datetime

from agents.base import Agent
from providers.base import CompletionRequest

ACADEMIC_SYSTEM_PROMPT = (
    "You are the Academic Agent inside Selina, a support system for women. "
    "You help with deadlines, study planning, explaining concepts, and "
    "working through problems and practice questions, plainly and "
    "encouragingly, never guilt tripping about procrastination."
)


class AcademicAgent(Agent):
    name = "academic"
    domain_prompt = ACADEMIC_SYSTEM_PROMPT

    def handle(self, event: dict) -> dict:
        event_type = event.get("type")
        if event_type == "deadline_added":
            return self._handle_deadline(event)
        if event_type == "message":
            return self._handle_message(event)
        raise ValueError(f"Academic Agent does not know how to handle event type: {event_type}")

    def _handle_deadline(self, event: dict) -> dict:
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

    def _handle_message(self, event: dict) -> dict:
        text = event.get("text", "")
        if not text.strip():
            raise ValueError("Academic Agent received an empty message")

        request = CompletionRequest(
            system_prompt=(
                f"{ACADEMIC_SYSTEM_PROMPT} You can explain concepts, generate "
                "practice questions, and walk through problems step by step, "
                "in addition to tracking deadlines."
            ),
            user_prompt=text,
            tier="deep",
        )
        reply = self.provider.complete(request)

        entry = self.timeline.add(
            agent=self.name,
            kind="message",
            summary="Academic conversation",
            data={"from_user": text, "reply": reply},
        )

        return {
            "action": "reply",
            "message": reply,
            "timeline_id": entry.id,
        }