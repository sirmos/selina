# Selina

Selina is a multi-agent app built to support women through safety, health, work, education, and everyday life. It's dedicated to two women I lost during pregnancy and childbirth.

This repo holds two hackathon entries and the backend that powers both:

selina/
  app/        Mobile app (React Native, Expo) — RevenueCat Shipaton 2026 entry
  vision/     OpenCV 5 safety pipeline — OpenCV AI Competition 2026 entry
  backend/    Shared multi-agent orchestrator used by both entries above
  docs/       Proposals and supporting notes

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
    EXPO_PUBLIC_RC_IOS_KEY=your_revenuecat_ios_key
    EXPO_PUBLIC_RC_ANDROID_KEY=your_revenuecat_android_key

For testing purchases without a paid Apple or Google developer account, use a RevenueCat Test Store key for both values, available free from your own RevenueCat project.

Then start the app:

    npx expo start

Scan the QR code with Expo Go, or run on a simulator/emulator.

If you'd rather point the app at the already-deployed backend instead of running one locally, use:

    EXPO_PUBLIC_API_URL=https://selina-cvoe.onrender.com

## app/ — RevenueCat Shipaton 2026 (Next Gen Award)

A home dashboard, a Companion chat, a Safety check-in flow, a Rights & Support case timeline, and Academic tools including scholarship guidance and study planning. Selina Plus, a subscription tier powered by RevenueCat, unlocks the deeper features. See `app/README.md` for more detail.

## vision/ — OpenCV AI Competition 2026 (powered by AWS)

An OpenCV 5 pipeline that takes a submitted photo or video and turns it into structured, privacy-protected safety evidence, then decides what the Safety agent should do with it. See `vision/README.md` for setup and current status.

## backend/ — shared reasoning layer

The Life Orchestrator and nine specialist agents: Safety, Health, Companion, Welfare, Rights and Support, Academic, Career, Financial, and Opportunity. It runs on a mock reasoning provider so it works fully offline, with the interface built to plug in a real model later. See `backend/README.md`.

## Status

Actively building `app/` and `vision/`. `backend/` is functionally complete for what both entries need from it.