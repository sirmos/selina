"""
Financial Agent. Tracks logged expenses against a simple monthly budget
and flags when spending is running ahead of pace, structured math first,
the provider only phrases the result.
"""

from agents.base import Agent
from providers.base import CompletionRequest

FINANCIAL_SYSTEM_PROMPT = (
    "You are the Financial Agent inside Selina, a support system for "
    "women. You report spending facts plainly, you never shame spending "
    "choices, you help the person see the picture clearly."
)


class FinancialAgent(Agent):
    name = "financial"

    def handle(self, event: dict) -> dict:
        if event.get("type") != "budget_check":
            raise ValueError(f"Financial Agent only handles type 'budget_check', got: {event.get('type')}")

        monthly_budget = event.get("monthly_budget", 0)
        spent_so_far = event.get("spent_so_far", 0)
        day_of_month = event.get("day_of_month", 1)
        days_in_month = event.get("days_in_month", 30)

        expected_pace = monthly_budget * (day_of_month / days_in_month) if monthly_budget else 0
        ahead_of_pace = spent_so_far > expected_pace

        request = CompletionRequest(
            system_prompt=FINANCIAL_SYSTEM_PROMPT,
            user_prompt=(
                f"Budget: {monthly_budget}, spent so far: {spent_so_far}, "
                f"day {day_of_month} of {days_in_month}. Write one short, factual line "
                "about whether spending is on pace, no judgment."
            ),
            tier="fast",
        )
        message = self.provider.complete(request)

        entry = self.timeline.add(
            agent=self.name,
            kind="budget_check",
            summary="Ahead of pace" if ahead_of_pace else "On pace",
            data={
                "monthly_budget": monthly_budget,
                "spent_so_far": spent_so_far,
                "expected_pace": round(expected_pace, 2),
                "message": message,
            },
        )

        return {
            "action": "flag_overspend" if ahead_of_pace else "on_track",
            "expected_pace": round(expected_pace, 2),
            "message": message,
            "timeline_id": entry.id,
        }
