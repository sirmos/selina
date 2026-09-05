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

from flask import Flask, request, jsonify

from providers.mock_provider import MockProvider
from orchestrator.life_orchestrator import LifeOrchestrator

app = Flask(__name__)

# MockProvider until Nebius access is unblocked, see README for how to
# switch this to NebiusProvider later, it is a one-line change.
provider = MockProvider()
orchestrator = LifeOrchestrator(provider)


@app.route("/selina/message", methods=["POST"])
def selina_message():
    """The single entry point for any channel where the person just types
    what's going on, no agent selection. This is what Photon's iMessage
    bridge calls."""
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
