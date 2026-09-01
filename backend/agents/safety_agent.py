"""
Safety Agent. Handles two kinds of events for now: a missed check in, and
an evidence result already produced by the vision pipeline (selina_vision,
in the vision/ folder). This agent does not run OpenCV itself, it consumes
the action dict that vision.pipeline.evidence_to_action() already produced,
keeping the two builds decoupled so each can be deployed and judged on its
own, while still working together.
"""

from agents.base import Agent
from providers.base import CompletionRequest

SAFETY_SYSTEM_PROMPT = (
    "You are the Safety Agent inside Selina, a support system for women. "
    "You write short, calm, direct messages, never alarmist, never vague. "
    "You never assume the worst, you help the person decide what happens next."
)


class SafetyAgent(Agent):
    name = "safety"

    def handle(self, event: dict) -> dict:
        event_type = event.get("type")

        if event_type == "checkin_missed":
            return self._handle_checkin_missed(event)
        if event_type == "evidence_processed":
            return self._handle_evidence(event)

        raise ValueError(f"Safety Agent does not know how to handle event type: {event_type}")

    def _handle_checkin_missed(self, event: dict) -> dict:
        request = CompletionRequest(
            system_prompt=SAFETY_SYSTEM_PROMPT,
            user_prompt=(
                f"A check in scheduled for {event.get('planned_time', 'an earlier time')} "
                "was missed. Write one short message offering to reach the person's "
                "emergency contact, without assuming anything is wrong yet."
            ),
            tier="fast",
        )
        message = self.provider.complete(request)

        entry = self.timeline.add(
            agent=self.name,
            kind="checkin_missed",
            summary="Check in missed, contact not yet notified",
            data={"event": event, "message": message},
        )

        return {
            "action": "offer_escalation",
            "message": message,
            "timeline_id": entry.id,
        }

    def _handle_evidence(self, event: dict) -> dict:
        evidence_action = event.get("evidence_action", {})
        action = evidence_action.get("action")

        if action == "request_retake":
            summary = f"Submission flagged for retake: {evidence_action.get('reason')}"
        elif action == "raise_priority_for_review":
            summary = f"Evidence flagged for priority review: {evidence_action.get('reason')}"
        else:
            summary = "Evidence added to timeline"

        entry = self.timeline.add(
            agent=self.name,
            kind="evidence_processed",
            summary=summary,
            data=evidence_action,
        )

        return {
            "action": action,
            "timeline_id": entry.id,
            "evidence_path": evidence_action.get("evidence_path"),
        }
