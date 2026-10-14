# Selina

Selina is a multi-agent app built to support women through safety, health, work, education, and everyday life. It's dedicated to two women I lost during pregnancy and childbirth.

Download a ready-to-install Android APK from the [latest release](https://github.com/sirmos/selina/releases/tag/v1.0-shipaton), no build steps needed to try the app.

This repo holds a mobile app, an OpenCV vision pipeline, and the backend that powers both:

```
selina/
  app/        Mobile app (React Native, Expo)
  vision/     OpenCV 5 safety evidence pipeline, deployed on AWS Lambda
  backend/    Multi-agent orchestrator used by both
  docs/       Proposals and supporting notes
```

## Running the backend

The backend is a Python Flask API. It runs on a mock reasoning provider by default, so no external API key is needed to run it locally.

    cd backend
    pip install -r requirements.txt
    python api.py

By default it runs on http://localhost:5000. This is the server the app talks to for chat, deadlines, case entries, and safety check-ins.

## Running the app

The app is built with React Native and Expo.

    cd app
    npm install

Create a `.env` file in `app/` with:

    EXPO_PUBLIC_API_URL=http://localhost:5000

Then start the app:

    npx expo start

Scan the QR code with Expo Go, or run on a simulator/emulator.

If you'd rather point the app at the already-deployed backend instead of running one locally, use:

    EXPO_PUBLIC_API_URL=https://selina-cvoe.onrender.com

## app/ - mobile app

A home dashboard, a Companion chat, a Safety check-in flow, a Rights & Support case timeline, and Academic tools including scholarship guidance and study planning. See `app/README.md` for more detail.

## vision/ - OpenCV AI Competition 2026 (powered by AWS)

An OpenCV 5 pipeline that takes a submitted photo or video and turns it into structured, privacy-protected safety evidence, then decides what the Safety Agent should do with it. It checks quality, blurs faces, flags sudden movement in video, and returns a next action: ask for a retake, raise priority, or file it.

It runs as a container on AWS Lambda. Try it here: https://poahahsvpz75pryep76avzuxxm0notan.lambda-url.us-east-1.on.aws/

On a 160-file test set it chose the correct next action 157 times and blurred 95 of 100 faces, with no false blurs. See `vision/README.md` for setup, results and known failures.

## backend/ - shared reasoning layer

The Life Orchestrator and nine specialist agents: Safety, Health, Companion, Welfare, Rights and Support, Academic, Career, Financial, and Opportunity. It runs on Groq by default, with a built-in mock provider as an offline fallback if that connection is ever unavailable. The Safety Agent takes the vision pipeline's result and decides what to do next. See `backend/README.md`.

## Status

Actively building `app/` and `vision/`. `backend/` is functionally complete for what both need from it.