# Photon bridge, pending account access

Not started yet. Waiting on a Photon account and project credentials from
app.photon.codes (IMESSAGE_PROJECT_ID, IMESSAGE_PROJECT_SECRET,
IMESSAGE_WEBHOOK_SECRET), and an OpenAI API key for real reasoning, see
backend/providers/openai_provider.py.

## What this will be

A small Node.js service using Photon's `@photon-ai/chat-adapter-imessage`
package. Its only job: receive an inbound iMessage event, call the
existing Python backend's `POST /selina/message` endpoint, and send the
reply back through Photon. All the actual intelligence, routing, and
memory stays in the Python backend, this stays a thin adapter, per the
hackathon's own build plan.

## Why it's empty right now

The Python side (natural language router, all nine agents in
conversational mode, the unified endpoint) is already built and tested,
see backend/tests/test_router.py. This folder is next, once credentials
exist there is nothing blocking it.
