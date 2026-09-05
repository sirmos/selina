# Selina backend, Life Orchestrator and agents

Shared reasoning layer behind the app/ and vision/ hackathon entries. Not
itself a hackathon submission.

## Status

The Nebius x NVIDIA Global AI Hackathon was dropped as a target, Nigeria
cannot currently be supported for Token Factory billing, confirmed by
Nebius support with no workaround, and the organizers confirmed this
doesn't change eligibility, only actual access. Rather than wait on that,
focus shifted fully to the other two entries. This backend keeps working
exactly as before, just running on `MockProvider` instead of real
Nemotron calls.

The orchestrator, provider interface, timeline store, API layer, and all
nine agents (Safety, Health, Companion, Rights and Support, Welfare,
Academic, Career, Financial, Opportunity) are built and verified working.
Run end to end against `MockProvider`, no network call, no API key,
tested three ways: the direct Python test, a live Flask server hit with
real HTTP requests, and the app's Companion, Safety check in, and Rights
and Support screens calling that live server with their real payloads.
See Verified behavior below.

`NebiusProvider` in `providers/nebius_provider.py` is left in place and
still written correctly, in case Nebius access becomes possible later, but
it is no longer something to actively pursue.

## Structure

```
backend/
  api.py               Flask HTTP layer, run this to start the server
  providers/
    base.py             LLMProvider interface, every agent talks through this only
    mock_provider.py    deterministic, no network, used for structured-event tests
    nebius_provider.py  real Nemotron calls via Token Factory, kept but not a priority
    openai_provider.py  real reasoning via OpenAI, needed for the Photon iMessage flow
  agents/
    base.py             Agent base class, handle() for structured events, handle_message() for free text
    safety_agent.py      handles missed check ins, vision evidence, and safety conversation
    health_agent.py      handles cycle tracking, symptom log entries, and health conversation
    companion_agent.py   open ended conversation, powers the chat screen and the default fallback
    rights_agent.py      handles the case timeline and rights conversation
    welfare_agent.py     compares agreed hours and pay, and welfare conversation
    academic_agent.py    tracks deadlines and academic conversation
    career_agent.py       tracks job applications and career conversation
    financial_agent.py    compares spending against budget pace and financial conversation
    opportunity_agent.py  logs opportunities and opportunity conversation
  orchestrator/
    life_orchestrator.py routes structured events (handle_event) and free text (handle_message)
    router.py             classifies free text into one or more of the nine agents
  memory/
    timeline_store.py    in-memory record of what each agent has done
  tests/
    test_orchestrator.py runs all nine agents end to end with MockProvider, structured events
    test_router.py       proves the natural language router and multi-agent dispatch work
  photon-bridge/         Node.js service connecting to Photon, not started, pending account access
```

All nine agents from the original build plan are built, each with both a
structured event handler and a conversational one.

## Two ways in

**Structured events** (`POST /event`), used by the mobile app: a specific
event type like `checkin_missed` or `cycle_logged`, routed by a fixed
table in `EVENT_ROUTES`.

**Natural language** (`POST /selina/message`), used by the iMessage
channel: whatever a person actually types, no event type, no agent
choice. The router in `orchestrator/router.py` reads the message and
decides which of the nine agents apply, possibly more than one, and
`LifeOrchestrator.handle_message()` dispatches to all of them and combines
their replies into one natural response. This is what makes "my boss
hasn't paid me for two months" turn into welfare, financial, and rights
all contributing to a single reply, without the person ever picking an
agent.

This only works well with a real reasoning provider. `MockProvider`
cannot produce real classifications, its canned replies don't parse into
agent names, so it correctly falls back to Companion, see
`test_router.py`'s first case. Real classification needs
`OpenAIProvider` (or `NebiusProvider`, if that ever unblocks) active.

## Setup

```
pip install -r requirements.txt
```

## Running the tests

```
python tests/test_orchestrator.py
python tests/test_router.py
```

Expect `All assertions passed, all 9 agents verified.` and
`All router assertions passed.`

## Running the API

```
python api.py
```

Then, from another terminal:

```
curl -X POST http://localhost:5000/event \
    -H "Content-Type: application/json" \
    -d '{"type": "checkin_missed", "planned_time": "9:40pm"}'

curl -X POST http://localhost:5000/selina/message \
    -H "Content-Type: application/json" \
    -d '{"message": "My boss has not paid me for two months."}'

curl http://localhost:5000/timeline
```

## Switching to real reasoning

Once you have an OpenAI key:

1. Add `OPENAI_API_KEY` to your environment.
2. In `orchestrator/life_orchestrator.py`'s construction (in `api.py`),
   change the provider from `MockProvider()` to `OpenAIProvider()`.
3. Rerun `tests/test_router.py`, the mechanism stays the same, only the
   classification quality and reply text change from mock or scripted
   text to real reasoning.

No agent or router code changes, that is the point of the provider
interface.

## Verified behavior

Running `test_orchestrator.py` currently confirms, across all nine agents:

- A missed check in event routes to the Safety Agent and returns `offer_escalation`.
- A usable evidence result from the vision pipeline returns `add_to_timeline`,
  a flagged one returns `raise_priority_for_review`.
- A cycle log entry correctly predicts the next date from the start date
  and average cycle length.
- A mild symptom returns `acknowledge`, a high severity one returns
  `suggest_doctor_visit`.
- A companion message returns a reply, an empty message correctly raises
  an error instead of silently doing nothing.
- A case entry with ordinary wording returns `add_to_case`, one with
  urgent wording returns `flag_for_review`.
- A welfare check in with a real gap between agreed and actual hours or
  pay returns `flag_mismatch`, a matching one returns `log_normal`.
- A deadline due within 2 days returns `urgent_reminder`, a distant one
  returns `schedule_reminder`.
- A job application follow up check returns `suggest_follow_up` at 7 or
  more days, `wait` otherwise.
- Spending ahead of the month's pace returns `flag_overspend`, on pace
  returns `on_track`.
- An opportunity with a deadline inside 5 days returns `urgent_deadline`,
  a distant one returns `log_opportunity`.
- Running the same event types against the live Flask server over real
  HTTP produces identical results to the direct Python test.

## If Nebius access ever opens up

1. Add `NEBIUS_API_KEY` to your environment, and install `openai`.
2. In `orchestrator/life_orchestrator.py`, change the provider passed in
   from `MockProvider()` to `NebiusProvider()`.
3. Rerun `tests/test_orchestrator.py`, the assertions on `action` values
   should still pass, only the `message` text changes from the mock reply
   to a real model response.

No agent code changes, that is the point of the provider interface. Not
a current priority, just kept ready.

## Connecting to the vision pipeline

The Safety Agent does not call OpenCV directly. The `vision/` project
produces an `evidence_action` dict via `evidence_to_action()`, that dict is
what gets passed in as `event["evidence_action"]` here. The two builds
stay decoupled, each can be deployed and judged separately, while still
working together end to end.
