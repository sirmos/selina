# Selina, mobile app

The Selina mobile app, built for the RevenueCat Shipaton 2026, Next Gen Award track. A Home screen showing what's happening across safety, health, academics, and a companion to talk to, a Rights & Support case timeline, and a Selina Plus subscription powered by RevenueCat.

## Setup

1. Install dependencies

npm install


2. Create a RevenueCat account and project at revenuecat.com, add your app, and create products with entitlement id `selina_plus` (already wired into `src/services/revenuecat.ts`). For testing without a paid Apple or Google developer account, use a RevenueCat Test Store key.

3. Copy the env file and add your keys

cp .env.example .env


4. Point `EXPO_PUBLIC_API_URL` at a running backend (see `../backend/README.md`), or use the deployed one at `https://selina-cvoe.onrender.com`.

5. Start the app with Expo

npm start


   Scan the QR code with Expo Go, or press `i` / `a` for a simulator.

## What's built

- Home dashboard summarizing safety, health, academics, and companion sections
- Safety check-in with timed auto-alerts to emergency contacts
- Health tab for cycle tracking and medication reminders
- Academic tab with chat, deadlines, and (Selina Plus) scholarship search and a study planner
- Rights & Support case timeline (Selina Plus)
- Selina Plus subscription flow via RevenueCat, testable through Test Store with no cost

## What's next

- Connecting the reasoning layer to a real model instead of the mock provider
- More Selina Plus features across Safety, Health, and Companion
- Career and Financial sections, not yet built