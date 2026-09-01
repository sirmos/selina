# Selina

Selina is a multi-agent system built to support women through safety,
health, work, education, and everyday life. It is dedicated to two women
lost during pregnancy and childbirth.

This repository holds two hackathon entries, plus the shared backend that
supports both.

## Structure

```
selina/
  app/        Mobile app (React Native, Expo), RevenueCat Shipaton 2026 entry
  vision/     OpenCV 5 safety evidence pipeline, OpenCV AI Competition 2026 entry
  backend/    Multi-agent orchestrator and reasoning layer, supports both
              entries above, not itself a hackathon submission
  docs/       Proposals and supporting documents
```

## The two entries

**app/**, RevenueCat Shipaton 2026, Next Gen Award
The Selina mobile app itself: a Home screen, a Companion flow, a Safety
check in flow, a Rights and Support case timeline, and a Selina Plus
subscription tier powered by the RevenueCat SDK. See `app/README.md` for
setup.

**vision/**, OpenCV AI Competition 2026, powered by AWS
A real OpenCV 5 pipeline that turns a submitted photo or video into
structured, privacy protected safety evidence, and decides what the
Safety Agent should do next based on what it finds. See
`vision/README.md` for setup and verified behavior.

## backend/, shared reasoning layer

The Life Orchestrator and nine specialist agents (Safety, Health,
Companion, Welfare, Rights and Support, Academic, Career, Financial,
Opportunity), all built and tested against a mock reasoning provider, no
external API key required. This is not itself entered in a hackathon, it
is what powers the intelligence behind the app and vision entries. See
`backend/README.md`.

The Nebius x NVIDIA Global AI Hackathon was dropped as a target after
Nebius confirmed Nigeria cannot currently be supported for Token Factory
billing, with no workaround available. The backend's provider interface
still supports plugging in real Nemotron calls later if that changes, but
it is no longer a build priority.

## Status

Actively building app/ and vision/. backend/ is functionally complete for
supporting both, running on a mock reasoning provider.
