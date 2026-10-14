"""
Safety Agent. Handles two kinds of events for now: a missed check in, and
an evidence result already produced by the vision pipeline (selina_vision,
in the vision/ folder). This agent does not run OpenCV itself, it consumes
the action dict that vision.pipeline.evidence_to_action() already produced,
keeping the two builds decoupled so each can be deployed and judged on its
own, while still working together.

The vision result decides what the agent does next:
  request_retake            -> asks the person for a new photo, with a tip
  raise_priority_for_review -> checks in on the person and offers to reach
                               her emergency contact
  add_to_timeline           -> files the evidence, nothing else
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
    domain_prompt = SAFETY_SYSTEM_PROMPT

    def handle(self, event: dict) -> dict:
        event_type = event.get("type")

        if event_type == "checkin_missed":
            return self._handle_checkin_missed(event)
        if event_type == "evidence_processed":
            return self._handle_evidence(event)

        raise ValueError(f"Safety Agent does not know how to handle event type: {event_type}")

    def _handle_checkin_missed(self, event: dict) -> dict:
        planned_time = event.get("planned_time", "an earlier time")
        context = event.get("context", "")

        if context:
            detail_sentence = f"A check in due {planned_time} was missed, {context}."
        else:
            detail_sentence = f"A check in due {planned_time} was missed."

        request = CompletionRequest(
            system_prompt=SAFETY_SYSTEM_PROMPT,
            user_prompt=(
                f"{detail_sentence} Write one short message offering to reach the person's "
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
        reason = evidence_action.get("reason")
        message = None

        if action == "request_retake":
            decision = "ask_retake"
            summary = f"Submission not stored, retake requested: {reason}"
            message = self.provider.complete(CompletionRequest(
                system_prompt=SAFETY_SYSTEM_PROMPT,
                user_prompt=(
                    f"The photo or clip the person sent could not be used because it is {reason}. "
                    "Write one short message asking her to send it again, with one practical tip "
                    "for fixing that. Do not mention technical measurements."
                ),
                tier="fast",
            ))
        elif action == "raise_priority_for_review":
            decision = "offer_escalation"
            summary = f"Evidence flagged for priority review: {reason}"
            message = self.provider.complete(CompletionRequest(
                system_prompt=SAFETY_SYSTEM_PROMPT,
                user_prompt=(
                    "A clip the person sent shows sudden or repeated movement. That can mean "
                    "something is wrong, or it can just be a shaky camera. Write one short message "
                    "that checks in on her and offers to reach her emergency contact, without "
                    "assuming anything is wrong."
                ),
                tier="fast",
            ))
        else:
            decision = "file_evidence"
            summary = "Evidence added to timeline"

        entry = self.timeline.add(
            agent=self.name,
            kind="evidence_processed",
            summary=summary,
            data={**evidence_action, "agent_decision": decision},
        )

        return {
            "action": action,
            "agent_decision": decision,
            "message": message,
            "timeline_id": entry.id,
            "evidence_path": evidence_action.get("evidence_path"),
        }