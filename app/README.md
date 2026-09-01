# Selina, mobile app starter

A starting point for the Selina mobile app, built for the RevenueCat Shipaton 2026,
Next Gen Award track. This is a small, real slice of the larger Selina project: a
Home screen showing what the agents are quietly handling, a Companion flow for
talking things through, and a Selina Plus paywall powered by RevenueCat.

This is a starting scaffold, not a finished app. The Companion screen currently
replies with a fixed placeholder message, that is intentional, it keeps the demo
working without needing the Nemotron reasoning layer connected yet. Everything
here is meant to be opened and continued in Claude Code or your own editor.

## Setup

1. Install dependencies

   ```
   npm install
   ```

2. Create a RevenueCat account and project at revenuecat.com, add your app,
   and create a subscription product with entitlement id `selina_plus`
   (this id is already wired into `src/services/revenuecat.ts`).

3. Copy the env file and add your RevenueCat keys

   ```
   cp .env.example .env
   ```

4. Start the app with Expo

   ```
   npm start
   ```

   Scan the QR code with the Expo Go app on your phone, or press `i` / `a`
   for a simulator if you have Xcode or Android Studio installed.

## What still needs building

- Fonts: the theme references Fraunces and Work Sans. Add
  `@expo-google-fonts/fraunces` and `@expo-google-fonts/work-sans`, then load
  them with `expo-font` before the app renders. Placeholder system fonts will
  show until this is done.
- Real content behind each Home screen card. Right now they are static examples.
- Connecting Companion's reply to the actual Life Orchestrator once Nebius
  access is unblocked.
- An app icon at 1024x1024 and a screenshot at 1179x2556 with no device frame,
  both required for the Devpost submission.
- A demo video under 2 minutes for the Next Gen submission, showing the app
  running and the purchase flow completing.

## Next Gen Award submission checklist

- [ ] Video, under 2 minutes, uploaded to YouTube or Vimeo, publicly visible
- [ ] Open source code repository, publicly accessible
- [ ] App description covering features and functionality
- [ ] App icon, 1024x1024
- [ ] Screenshot, 1179x2556, no device frame
- [ ] A way for judges to test the premium features, a free trial or a promo code
