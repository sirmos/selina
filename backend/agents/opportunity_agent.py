"""
Opportunity Agent. Logs an opportunity (a scholarship, grant, job posting,
program) that the person found or that a future search tool surfaced, and
tracks whether its deadline is coming up. This is where a real search
tool (Tavily, in the original build plan) would plug in later to surface
opportunities proactively, for now it only organizes what is logged.
"""

from datetime import datetime

from agents.base import Agent

OPPORTUNITY_URGENT_DAYS = 5


class OpportunityAgent(Agent):
    name = "opportunity"

    def handle(self, event: dict) -> dict:
        if event.get("type") != "opportunity_logged":
            raise ValueError(f"Opportunity Agent only handles type 'opportunity_logged', got: {event.get('type')}")

        title = event.get("title", "an opportunity")
        deadline_str = event.get("deadline")

        days_remaining = None
        if deadline_str:
            deadline = datetime.fromisoformat(deadline_str)
            days_remaining = (deadline.date() - datetime.now().date()).days

        urgent = days_remaining is not None and days_remaining <= OPPORTUNITY_URGENT_DAYS

        entry = self.timeline.add(
            agent=self.name,
            kind="opportunity_logged",
            summary=f"{title}, deadline in {days_remaining} days" if days_remaining is not None else title,
            data={"title": title, "deadline": deadline_str},
        )

        return {
            "action": "urgent_deadline" if urgent else "log_opportunity",
            "days_remaining": days_remaining,
            "timeline_id": entry.id,
        }
