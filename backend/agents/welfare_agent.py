"""
Welfare Agent. Compares agreed hours and pay against what was actually
reported, and flags a mismatch. This is structured comparison, not
reasoning, the provider is only used to phrase the result, never to decide
whether a mismatch happened, that decision is plain arithmetic on purpose,
so it can't be talked out of flagging a real gap.
"""

from agents.base import Agent
from providers.base import CompletionRequest

WELFARE_SYSTEM_PROMPT = (
    "You are the Welfare Agent inside Selina, a support system for women. "
    "You report facts about hours and pay plainly and without judgment, "
    "the person decides what it means and what to do about it."
)


class WelfareAgent(Agent):
    name = "welfare"
    domain_prompt = WELFARE_SYSTEM_PROMPT

    def handle(self, event: dict) -> dict:
        if event.get("type") != "welfare_checkin":
            raise ValueError(f"Welfare Agent only handles type 'welfare_checkin', got: {event.get('type')}")

        agreed_hours = event.get("agreed_hours")
        actual_hours = event.get("actual_hours")
        agreed_pay = event.get("agreed_pay")
        actual_pay = event.get("actual_pay")

        hours_gap = None
        if agreed_hours is not None and actual_hours is not None:
            hours_gap = actual_hours - agreed_hours

        pay_gap = None
        if agreed_pay is not None and actual_pay is not None:
            pay_gap = actual_pay - agreed_pay

        mismatch = (hours_gap is not None and hours_gap > 0) or (pay_gap is not None and pay_gap < 0)

        request = CompletionRequest(
            system_prompt=WELFARE_SYSTEM_PROMPT,
            user_prompt=(
                f"Agreed hours: {agreed_hours}, actual hours: {actual_hours}, "
                f"agreed pay: {agreed_pay}, actual pay: {actual_pay}. "
                "Write one short, factual summary of what this check in shows."
            ),
            tier="fast",
        )
        message = self.provider.complete(request)

        entry = self.timeline.add(
            agent=self.name,
            kind="welfare_checkin",
            summary="Mismatch found" if mismatch else "Matches what was agreed",
            data={
                "hours_gap": hours_gap,
                "pay_gap": pay_gap,
                "message": message,
            },
        )

        return {
            "action": "flag_mismatch" if mismatch else "log_normal",
            "hours_gap": hours_gap,
            "pay_gap": pay_gap,
            "message": message,
            "timeline_id": entry.id,
        }
