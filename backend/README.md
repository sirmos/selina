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
    mock_provider.py    deterministic, no network, used for all current tests
    nebius_provider.py  real Nemotron calls via Token Factory, kept but not a priority
  agents/
    base.py             Agent base class
    safety_agent.py      handles missed check ins and vision evidence results
    health_agent.py      handles cycle tracking and symptom log entries
    companion_agent.py   open ended conversation, powers the chat screen
    rights_agent.py      handles the case timeline behind Rights and Support
    welfare_agent.py     compares agreed hours and pay against what was reported
    academic_agent.py    tracks deadlines and study reminders
    career_agent.py       tracks job applications and follow up timing
    financial_agent.py    compares spending against a simple budget pace
    opportunity_agent.py  logs opportunities and flags urgent deadlines
  orchestrator/
    life_orchestrator.py routes events to the right agent
  memory/
    timeline_store.py    in-memory record of what each agent has done
  tests/
    test_orchestrator.py runs all nine agents end to end with MockProvider
```

All nine agents from the original build plan are built. Deeper logic and
real tool integrations (Tavily for Opportunity, more nuanced reasoning
throughout) can still be added on top of any of them.

## Setup

```
pip install -r requirements.txt
```

## Running the tests

```
python tests/test_orchestrator.py
```

Expect output ending in `All assertions passed, all 9 agents verified.`

## Running the API

```
python api.py
```

Then, from another terminal:

```
curl -X POST http://localhost:5000/event \
    -H "Content-Type: application/json" \
    -d '{"type": "checkin_missed", "planned_time": "9:40pm"}'

curl http://localhost:5000/timeline
```

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
