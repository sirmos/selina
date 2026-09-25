"""
Health Agent. Handles menstrual cycle calculation, medication reminder
scheduling, and a general symptom log entry. Dates and times are computed
with plain arithmetic here, never left to the language model, since this
is exactly the kind of thing a model can get subtly wrong.
"""

from datetime import datetime, timedelta

from agents.base import Agent
from providers.base import CompletionRequest

HEALTH_SYSTEM_PROMPT = (
    "You are the Health Agent inside Selina, a support system for women. "
    "You write short, warm, factual messages about health tracking. You "
    "never diagnose anything, you help the person notice patterns and "
    "decide whether to see a doctor, the decision is always theirs. Reply "
    "in plain conversational text only, never use Markdown formatting "
    "like #, *, or bullet symbols."
)


class HealthAgent(Agent):
    name = "health"
    domain_prompt = HEALTH_SYSTEM_PROMPT

    def handle(self, event: dict) -> dict:
        event_type = event.get("type")

        if event_type == "cycle_logged":
            return self._handle_cycle_logged(event)
        if event_type == "cycle_calculate":
            return self._handle_cycle_calculate(event)
        if event_type == "symptom_logged":
            return self._handle_symptom_logged(event)
        if event_type == "medication_added":
            return self._handle_medication_added(event)

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

    def _handle_cycle_calculate(self, event: dict) -> dict:
        start_str = event.get("start_date")
        if not start_str:
            raise ValueError("cycle_calculate requires start_date")

        cycle_length = event.get("cycle_length_days", 28)
        period_length = event.get("period_length_days", 5)
        start = datetime.fromisoformat(start_str).date()

        period_end = start + timedelta(days=period_length - 1)
        next_period_start = start + timedelta(days=cycle_length)
        next_period_end = next_period_start + timedelta(days=period_length - 1)
        ovulation_day = next_period_start - timedelta(days=14)
        fertile_start = ovulation_day - timedelta(days=5)
        fertile_end = ovulation_day + timedelta(days=1)

        safe_before_start = period_end + timedelta(days=1)
        safe_before_end = fertile_start - timedelta(days=1)
        safe_after_start = fertile_end + timedelta(days=1)
        safe_after_end = next_period_start - timedelta(days=1)

        computed = {
            "period_start": start.isoformat(),
            "period_end": period_end.isoformat(),
            "ovulation_day": ovulation_day.isoformat(),
            "fertile_window": {"start": fertile_start.isoformat(), "end": fertile_end.isoformat()},
            "safe_days_before_ovulation": (
                {"start": safe_before_start.isoformat(), "end": safe_before_end.isoformat()}
                if safe_before_end >= safe_before_start else None
            ),
            "safe_days_after_ovulation": (
                {"start": safe_after_start.isoformat(), "end": safe_after_end.isoformat()}
                if safe_after_end >= safe_after_start else None
            ),
            "next_period": {"start": next_period_start.isoformat(), "end": next_period_end.isoformat()},
        }

        request = CompletionRequest(
            system_prompt=HEALTH_SYSTEM_PROMPT,
            user_prompt=(
                "Using only this already-calculated data, write exactly one warm, reassuring "
                "sentence acknowledging her cycle has been calculated and estimates are ready below. "
                f"Do not list or repeat any of the actual dates yourself, they're shown separately. Data: {computed}. "
                "Follow it with one short second sentence noting this is an estimate based on averages, "
                "not a guarantee, and a doctor or dedicated method is best for anything important like "
                "contraception planning."
            ),
            tier="fast",
        )
        message = self.provider.complete(request)

        entry = self.timeline.add(
            agent=self.name,
            kind="cycle_calculated",
            summary=f"Cycle calculated, next period around {computed['next_period']['start']}",
            data={**computed, "message": message},
        )

        return {
            "action": "cycle_summary",
            "computed": computed,
            "message": message,
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

    def _handle_medication_added(self, event: dict) -> dict:
        name = event.get("name", "your medication")
        schedule_type = event.get("schedule_type")
        start_time_str = event.get("start_time")

        if not start_time_str:
            raise ValueError("medication_added requires start_time")
        start_time = datetime.fromisoformat(start_time_str)

        doses = []
        if schedule_type == "interval_hours":
            interval = event.get("interval_hours", 8)
            dose_count = event.get("dose_count", 3)
            for i in range(dose_count):
                doses.append((start_time + timedelta(hours=interval * i)).isoformat())
        elif schedule_type == "times_of_day":
            times_of_day = event.get("times_of_day", ["08:00", "20:00"])
            days = event.get("duration_days", 1)
            base_date = start_time.date()
            for day_offset in range(days):
                for t in times_of_day:
                    hour, minute = map(int, t.strip().split(":"))
                    dose_dt = datetime.combine(base_date + timedelta(days=day_offset), datetime.min.time()).replace(
                        hour=hour, minute=minute
                    )
                    doses.append(dose_dt.isoformat())
        else:
            raise ValueError(f"Unknown schedule_type: {schedule_type}")

        request = CompletionRequest(
            system_prompt=HEALTH_SYSTEM_PROMPT,
            user_prompt=(
                f"A medication reminder schedule was set up for {name}, with these "
                f"already-calculated dose times: {doses}. Write one short, warm message "
                "confirming the schedule in a natural way, and note that consistent timing "
                "matters for how well it works, without being preachy about it."
            ),
            tier="fast",
        )
        message = self.provider.complete(request)

        entry = self.timeline.add(
            agent=self.name,
            kind="medication_added",
            summary=f"{name}, {len(doses)} doses scheduled",
            data={"name": name, "doses": doses, "message": message},
        )

        return {
            "action": "medication_scheduled",
            "name": name,
            "doses": doses,
            "message": message,
            "timeline_id": entry.id,
        }