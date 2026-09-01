import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from providers.mock_provider import MockProvider
from orchestrator.life_orchestrator import LifeOrchestrator


def run():
    provider = MockProvider()
    orchestrator = LifeOrchestrator(provider)

    print("--- missed check in ---")
    result = orchestrator.handle_event({
        "type": "checkin_missed",
        "planned_time": "9:40pm",
    })
    print(result)
    assert result["action"] == "offer_escalation"

    print("\n--- usable evidence ---")
    result = orchestrator.handle_event({
        "type": "evidence_processed",
        "evidence_action": {
            "action": "add_to_timeline",
            "reason": "usable evidence, no motion flag raised",
            "evidence_path": "/tmp/blurred_sample.jpg",
        },
    })
    print(result)
    assert result["action"] == "add_to_timeline"

    print("\n--- flagged evidence ---")
    result = orchestrator.handle_event({
        "type": "evidence_processed",
        "evidence_action": {
            "action": "raise_priority_for_review",
            "reason": "movement pattern worth a closer look",
            "evidence_path": "/tmp/blurred_keyframe.jpg",
        },
    })
    print(result)
    assert result["action"] == "raise_priority_for_review"

    print("\n--- timeline contents ---")
    for entry in orchestrator.timeline.all():
        print(entry)

    assert len(orchestrator.timeline.all()) == 3
    assert len(provider.calls) == 1  # only the checkin_missed path calls the provider

    print("\n--- cycle logged (health) ---")
    result = orchestrator.handle_event({
        "type": "cycle_logged",
        "start_date": "2026-08-15",
        "average_cycle_length_days": 28,
    })
    print(result)
    assert result["action"] == "schedule_reminder"
    assert result["next_predicted"] == "2026-09-12"

    print("\n--- symptom logged, mild (health) ---")
    result = orchestrator.handle_event({
        "type": "symptom_logged",
        "symptom": "cramping",
        "severity": "mild",
    })
    print(result)
    assert result["action"] == "acknowledge"

    print("\n--- symptom logged, high severity (health) ---")
    result = orchestrator.handle_event({
        "type": "symptom_logged",
        "symptom": "sharp pain",
        "severity": "high",
    })
    print(result)
    assert result["action"] == "suggest_doctor_visit"

    print("\n--- companion message ---")
    result = orchestrator.handle_event({
        "type": "message",
        "text": "I don't really know how to explain what happened today.",
    })
    print(result)
    assert result["action"] == "reply"
    assert result["message"]  # non-empty

    print("\n--- companion empty message should raise ---")
    try:
        orchestrator.handle_event({"type": "message", "text": "   "})
        raise AssertionError("expected a ValueError for an empty message")
    except ValueError as exc:
        print("correctly raised:", exc)

    assert len(orchestrator.timeline.all()) == 7  # 3 safety + 3 health/companion... see below

    print("\n--- case entry (rights), normal ---")
    result = orchestrator.handle_event({
        "type": "case_entry_added",
        "detail": "Worked the agreed hours today, nothing unusual.",
    })
    print(result)
    assert result["action"] == "add_to_case"

    print("\n--- case entry (rights), flagged ---")
    result = orchestrator.handle_event({
        "type": "case_entry_added",
        "detail": "Was not paid this week, employer refused to pay on time.",
    })
    print(result)
    assert result["action"] == "flag_for_review"

    print("\n--- welfare checkin, mismatch ---")
    result = orchestrator.handle_event({
        "type": "welfare_checkin",
        "agreed_hours": 8,
        "actual_hours": 12,
        "agreed_pay": 5000,
        "actual_pay": 5000,
    })
    print(result)
    assert result["action"] == "flag_mismatch"

    print("\n--- welfare checkin, normal ---")
    result = orchestrator.handle_event({
        "type": "welfare_checkin",
        "agreed_hours": 8,
        "actual_hours": 8,
        "agreed_pay": 5000,
        "actual_pay": 5000,
    })
    print(result)
    assert result["action"] == "log_normal"

    print("\n--- deadline added, urgent ---")
    from datetime import date, timedelta
    soon = (date.today() + timedelta(days=1)).isoformat()
    result = orchestrator.handle_event({
        "type": "deadline_added",
        "title": "Scholarship essay",
        "due_date": soon,
    })
    print(result)
    assert result["action"] == "urgent_reminder"

    print("\n--- deadline added, not urgent ---")
    far = (date.today() + timedelta(days=20)).isoformat()
    result = orchestrator.handle_event({
        "type": "deadline_added",
        "title": "Term paper",
        "due_date": far,
    })
    print(result)
    assert result["action"] == "schedule_reminder"

    print("\n--- application logged (career) ---")
    result = orchestrator.handle_event({
        "type": "application_logged",
        "company": "Acme Corp",
        "role": "Data Analyst",
        "applied_date": (date.today() - timedelta(days=10)).isoformat(),
    })
    print(result)
    assert result["action"] == "log_application"

    print("\n--- application status check, follow up due (career) ---")
    result = orchestrator.handle_event({
        "type": "application_status_check",
        "applied_date": (date.today() - timedelta(days=10)).isoformat(),
    })
    print(result)
    assert result["action"] == "suggest_follow_up"

    print("\n--- application status check, too soon (career) ---")
    result = orchestrator.handle_event({
        "type": "application_status_check",
        "applied_date": (date.today() - timedelta(days=2)).isoformat(),
    })
    print(result)
    assert result["action"] == "wait"

    print("\n--- budget check, overspending (financial) ---")
    result = orchestrator.handle_event({
        "type": "budget_check",
        "monthly_budget": 30000,
        "spent_so_far": 20000,
        "day_of_month": 10,
        "days_in_month": 30,
    })
    print(result)
    assert result["action"] == "flag_overspend"

    print("\n--- budget check, on track (financial) ---")
    result = orchestrator.handle_event({
        "type": "budget_check",
        "monthly_budget": 30000,
        "spent_so_far": 5000,
        "day_of_month": 10,
        "days_in_month": 30,
    })
    print(result)
    assert result["action"] == "on_track"

    print("\n--- opportunity logged, urgent (opportunity) ---")
    result = orchestrator.handle_event({
        "type": "opportunity_logged",
        "title": "Women in Tech grant",
        "deadline": (date.today() + timedelta(days=3)).isoformat(),
    })
    print(result)
    assert result["action"] == "urgent_deadline"

    print("\n--- opportunity logged, not urgent (opportunity) ---")
    result = orchestrator.handle_event({
        "type": "opportunity_logged",
        "title": "Community fellowship",
        "deadline": (date.today() + timedelta(days=30)).isoformat(),
    })
    print(result)
    assert result["action"] == "log_opportunity"

    print("\n--- final timeline count ---")
    print(len(orchestrator.timeline.all()), "entries across", len(orchestrator.agents), "agents")
    assert len(orchestrator.timeline.all()) == 20
    assert len(orchestrator.agents) == 9  # all agents from the build doc are now real,
    # one more than the "eight" figure used in earlier planning notes, Welfare and
    # Rights & Support turned out to be two separate agents, not one, once built.

    print("\nAll assertions passed, all 9 agents verified.")


if __name__ == "__main__":
    run()
