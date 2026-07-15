# SocialHan Mobile

React Native (Expo) client for SocialHan. The plan and phase breakdown live in
[`../MOBILE_PLAN.md`](../MOBILE_PLAN.md).

## Stack

Expo SDK 56, expo-router, NativeWind v4, TanStack Query v5, Zustand, axios,
react-hook-form + zod.

## Development (Expo Go)

Everything up to push notifications runs in the Expo Go app — no native build
needed. Install Expo Go on the device, then:

```bash
npm install
cp .env.example .env        # set EXPO_PUBLIC_API_URL (LAN IP for local api, or the prod domain)
npm start                   # scan the QR with Expo Go (same Wi-Fi network)
npm run typecheck
```

Native Firebase push (phase M6) is the first thing that requires a dev-client
build (`eas build --profile development --platform android`); until then stay
on Expo Go. `google-services.json` is gitignored — never commit it.
