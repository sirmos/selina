"""
Life Orchestrator. Receives an event, works out which agent should handle
it, and returns that agent's next action. This is the one place that knows
about every agent, agents themselves do not know about each other.
"""

from providers.base import LLMProvider
from memory.timeline_store import TimelineStore
from agents.safety_agent import SafetyAgent
from agents.health_agent import HealthAgent
from agents.companion_agent import CompanionAgent
from agents.rights_agent import RightsAgent
from agents.welfare_agent import WelfareAgent
from agents.academic_agent import AcademicAgent
from agents.career_agent import CareerAgent
from agents.financial_agent import FinancialAgent
from agents.opportunity_agent import OpportunityAgent
from orchestrator.router import classify

# Maps event type to the agent that owns it. This table is the whole
# routing layer for the structured, app-driven flow, every event type
# Selina understands is listed here. The natural language flow, used by
# the iMessage channel, does not use this table, see handle_message below.
EVENT_ROUTES = {
    "checkin_missed": "safety",
    "evidence_processed": "safety",
    "cycle_logged": "health",
    "symptom_logged": "health",
    "message": "companion",
    "case_entry_added": "rights",
    "welfare_checkin": "welfare",
    "deadline_added": "academic",
    "application_logged": "career",
    "application_status_check": "career",
    "budget_check": "financial",
    "opportunity_logged": "opportunity",
}


class LifeOrchestrator:
    def __init__(self, provider: LLMProvider):
        self.provider = provider
        self.timeline = TimelineStore()
        self.agents = {
            "safety": SafetyAgent(provider, self.timeline),
            "health": HealthAgent(provider, self.timeline),
            "companion": CompanionAgent(provider, self.timeline),
            "rights": RightsAgent(provider, self.timeline),
            "welfare": WelfareAgent(provider, self.timeline),
            "academic": AcademicAgent(provider, self.timeline),
            "career": CareerAgent(provider, self.timeline),
            "financial": FinancialAgent(provider, self.timeline),
            "opportunity": OpportunityAgent(provider, self.timeline),
        }

    def handle_event(self, event: dict) -> dict:
        event_type = event.get("type")
        agent_name = EVENT_ROUTES.get(event_type)

        if agent_name is None:
            raise ValueError(f"No agent registered for event type: {event_type}")

        agent = self.agents[agent_name]
        return agent.handle(event)

    def handle_message(self, text: str) -> dict:
        """Natural language entry point, used by the iMessage channel. The
        person never chooses an agent, this classifies her message and
        dispatches to whichever specialist areas actually apply, possibly
        more than one."""
        if not text or not text.strip():
            raise ValueError("Message text cannot be empty")

        agent_names = classify(self.provider, text)
        results = []

        for name in agent_names:
            agent = self.agents.get(name)
            if agent:
                results.append((name, agent.handle_message(text)))

        if not results:
            # Should not happen, classify() always returns at least one
            # valid name, but never let a routing gap produce silence.
            results = [("companion", self.agents["companion"].handle_message(text))]

        if len(results) == 1:
            _, result = results[0]
            result["agents_involved"] = [results[0][0]]
            return result

        combined_message = " ".join(
            result["message"] for _, result in results if result.get("message")
        )
        return {
            "action": "reply",
            "message": combined_message,
            "agents_involved": [name for name, _ in results],
        }
