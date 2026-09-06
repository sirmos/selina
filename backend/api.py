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

app = Flask(__name__)

# Builds a chain from whichever free-tier keys are actually set, tried in
# this order, falling through to the next the moment one fails for any
# reason (retired model, rate limit, bad key). MockProvider is always
# appended automatically inside FallbackProvider as the guaranteed last
# resort, so this never crashes a request even if every real provider is
# down at once.
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
