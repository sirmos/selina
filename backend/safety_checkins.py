"""
Server-side safety check-ins. This is what makes a check-in survive the
app being backgrounded, minimized, or navigated away from, the phone
isn't what's keeping time, the server is. It also makes escalation
automatic: if the deadline passes with no "I'm safe," this fires on its
own, nobody has to be looking at the app or tap anything for it to happen.

Honest limit: this generates and records the escalation message and who
it's for. It does not yet send a real SMS or push notification to the
contact's actual phone, that needs a service like Twilio wired in on top
of this, which isn't set up. What's here is the real scheduling and
decision logic, the last mile of actually delivering it is the piece
still missing.
"""

import threading
import uuid
from datetime import datetime, timedelta, timezone

checkins = {}
_lock = threading.Lock()


def start_checkin(duration_seconds, trip_details, contacts, orchestrator):
    checkin_id = str(uuid.uuid4())
    deadline = datetime.now(timezone.utc) + timedelta(seconds=duration_seconds)

    record = {
        "id": checkin_id,
        "status": "scheduled",
        "duration_seconds": duration_seconds,
        "deadline": deadline.isoformat(),
        "trip_details": trip_details or {},
        "contacts": contacts,
        "escalation_message": None,
        "auto_escalated": False,
    }

    with _lock:
        checkins[checkin_id] = record

    timer = threading.Timer(duration_seconds, _fire_escalation, args=[checkin_id, orchestrator])
    timer.daemon = True
    timer.start()
    record["_timer"] = timer

    return record


def _fire_escalation(checkin_id, orchestrator):
    with _lock:
        record = checkins.get(checkin_id)
        if not record or record["status"] != "scheduled":
            return
        record["status"] = "missed"

    trip = record["trip_details"] or {}
    detail_bits = []
    if trip.get("destination"):
        detail_bits.append(f"headed to {trip['destination']}")
    if trip.get("meeting_who"):
        detail_bits.append(f"meeting {trip['meeting_who']}")
    if trip.get("risk_note"):
        detail_bits.append(f"noted concern: {trip['risk_note']}")
    context = ", ".join(detail_bits) if detail_bits else ""

    minutes = record["duration_seconds"] // 60
    event = {
        "type": "checkin_missed",
        "planned_time": f"{minutes} minutes ago",
        "context": context,
    }
    result = orchestrator.handle_event(event)

    with _lock:
        record["escalation_message"] = result.get("message")
        record["auto_escalated"] = True
        record["contacts_notified"] = [c.get("name") for c in record["contacts"]]


def mark_safe(checkin_id):
    with _lock:
        record = checkins.get(checkin_id)
        if not record:
            return None
        if record["status"] == "scheduled":
            timer = record.get("_timer")
            if timer:
                timer.cancel()
        record["status"] = "safe"
        return _public(record)


def trigger_now(checkin_id, orchestrator):
    with _lock:
        record = checkins.get(checkin_id)
        if not record:
            return None
        timer = record.get("_timer")
        if timer:
            timer.cancel()
    _fire_escalation(checkin_id, orchestrator)
    with _lock:
        return _public(checkins[checkin_id])


def get_checkin(checkin_id):
    with _lock:
        record = checkins.get(checkin_id)
        if not record:
            return None
        return _public(record)


def _public(record):
    deadline = datetime.fromisoformat(record["deadline"])
    now = datetime.now(timezone.utc)
    seconds_left = max(0, int((deadline - now).total_seconds()))
    public = {k: v for k, v in record.items() if k != "_timer"}
    public["seconds_left"] = seconds_left
    return public
