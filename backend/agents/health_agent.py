"""
Health Agent. Handles cycle tracking reminders and a general symptom log
entry for now, the smallest genuinely useful slice of what this agent will
eventually cover.
"""

from datetime import datetime, timedelta

from agents.base import Agent
from providers.base import CompletionRequest

HEALTH_SYSTEM_PROMPT = (
    "You are the Health Agent inside Selina, a support system for women. "
    "You write short, warm, factual messages about health tracking. You "
    "never diagnose anything, you help the person notice patterns and "
    "decide whether to see a doctor, the decision is always theirs."
)


class HealthAgent(Agent):
    name = "health"

    def handle(self, event: dict) -> dict:
        event_type = event.get("type")

        if event_type == "cycle_logged":
            return self._handle_cycle_logged(event)
        if event_type == "symptom_logged":
            return self._handle_symptom_logged(event)

        raise ValueError(f"Health Agent does not know how to handle event type: {event_type}")

    def _handle_cycle_logged(self, event: dict) -> dict:
        start_date_str = event.get("start_date")
        cycle_length_days = event.get("average_cycle_length_days", 28)

        next_predicted = None
        if start_date_str:
            start_date = datetime.fromisoformat(start_date_str)
            next_predicted = (start_date + timedelta(days=cycle_length_days)).date().isoformat()

        entry = self.timeline.add(
            agent=self.name,
            kind="cycle_logged",
            summary=f"Cycle logged, next one predicted around {next_predicted}",
            data={"start_date": start_date_str, "next_predicted": next_predicted},
        )

        return {
            "action": "schedule_reminder",
            "next_predicted": next_predicted,
            "timeline_id": entry.id,
        }

    def _handle_symptom_logged(self, event: dict) -> dict:
        symptom = event.get("symptom", "unspecified symptom")
        severity = event.get("severity", "mild")

        request = CompletionRequest(
            system_prompt=HEALTH_SYSTEM_PROMPT,
            user_prompt=(
                f"The person logged: {symptom}, severity {severity}. Write one short, "
                "factual acknowledgment, and only suggest seeing a doctor if the "
                "severity is high, never diagnose what it might be."
            ),
            tier="fast",
        )
        message = self.provider.complete(request)

        entry = self.timeline.add(
            agent=self.name,
            kind="symptom_logged",
            summary=f"Logged: {symptom} ({severity})",
            data={"symptom": symptom, "severity": severity, "message": message},
        )

        suggest_doctor = severity == "high"

        return {
            "action": "suggest_doctor_visit" if suggest_doctor else "acknowledge",
            "message": message,
            "timeline_id": entry.id,
        }
