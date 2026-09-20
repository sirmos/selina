"""
A thin HTTP layer over the Life Orchestrator. This is what the mobile app
would call in production. Built with Flask here since it is what this
development environment has available offline, swap for FastAPI or
anything else later, the orchestrator underneath does not care.

Run locally:
    python api.py

Then:
    curl -X POST http://localhost:5000/event \
        -H "Content-Type: application/json" \
        -d '{"type": "checkin_missed", "planned_time": "9:40pm"}'
"""

import os
from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv()

from providers.fallback_provider import FallbackProvider
from orchestrator.life_orchestrator import LifeOrchestrator
from safety_checkins import start_checkin, mark_safe, get_checkin, trigger_now

app = Flask(__name__)

chain = []

if os.environ.get("GROQ_API_KEY"):
    from providers.groq_provider import GroqProvider
    chain.append(("groq", GroqProvider()))

if os.environ.get("GEMINI_API_KEY"):
    from providers.gemini_provider import GeminiProvider
    chain.append(("gemini", GeminiProvider()))

if os.environ.get("OPENROUTER_API_KEY"):
    from providers.openrouter_provider import OpenRouterProvider
    chain.append(("openrouter", OpenRouterProvider()))

if os.environ.get("OPENAI_API_KEY"):
    from providers.openai_provider import OpenAIProvider
    chain.append(("openai", OpenAIProvider()))

if chain:
    print(f"Real reasoning active, provider chain: {[name for name, _ in chain]} (falls back to mock if all fail)")
else:
    print("No provider keys found, using MockProvider only, replies will be canned text.")

provider = FallbackProvider(chain)
orchestrator = LifeOrchestrator(provider)


@app.route("/selina/message", methods=["POST"])
def selina_message():
    body = request.get_json(force=True, silent=True)
    if not body or not body.get("message"):
        return jsonify({"error": "Request body must include 'message'"}), 400

    try:
        result = orchestrator.handle_message(body["message"])
        return jsonify(result), 200
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.route("/event", methods=["POST"])
def handle_event():
    event = request.get_json(force=True, silent=True)
    if event is None:
        return jsonify({"error": "Request body must be JSON"}), 400

    try:
        result = orchestrator.handle_event(event)
        return jsonify(result), 200
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.route("/safety/checkin", methods=["POST"])
def safety_checkin_start():
    """Starts a check in that the server itself tracks, so it keeps
    running whether the app is open, backgrounded, or the phone is put
    away, and auto escalates on its own if the deadline passes."""
    body = request.get_json(force=True, silent=True) or {}
    duration_seconds = body.get("duration_seconds")
    if not duration_seconds or duration_seconds <= 0:
        return jsonify({"error": "duration_seconds is required and must be positive"}), 400

    contacts = body.get("contacts", [])
    if not contacts:
        return jsonify({"error": "at least one contact is required"}), 400

    trip_details = body.get("trip_details", {})
    record = start_checkin(duration_seconds, trip_details, contacts, orchestrator)
    public = {k: v for k, v in record.items() if k != "_timer"}
    return jsonify(public), 201


@app.route("/safety/checkin/<checkin_id>/safe", methods=["POST"])
def safety_checkin_safe(checkin_id):
    record = mark_safe(checkin_id)
    if not record:
        return jsonify({"error": "check in not found"}), 404
    return jsonify(record), 200


@app.route("/safety/checkin/<checkin_id>/trigger", methods=["POST"])
def safety_checkin_trigger(checkin_id):
    """Manual, immediate escalation, 'I feel unsafe right now,' or used
    on someone else's behalf if a phone has been taken."""
    record = trigger_now(checkin_id, orchestrator)
    if not record:
        return jsonify({"error": "check in not found"}), 404
    return jsonify(record), 200


@app.route("/safety/checkin/<checkin_id>", methods=["GET"])
def safety_checkin_status(checkin_id):
    """The app calls this whenever the Safety screen is opened or
    reopened, to resync its displayed timer against the server's real
    clock rather than trusting whatever the phone's own timer thinks."""
    record = get_checkin(checkin_id)
    if not record:
        return jsonify({"error": "check in not found"}), 404
    return jsonify(record), 200


@app.route("/timeline", methods=["GET"])
def get_timeline():
    entries = [
        {
            "id": e.id,
            "agent": e.agent,
            "kind": e.kind,
            "summary": e.summary,
            "created_at": e.created_at,
        }
        for e in orchestrator.timeline.all()
    ]
    return jsonify({"entries": entries}), 200


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
