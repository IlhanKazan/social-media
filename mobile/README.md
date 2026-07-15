# SocialHan Mobile

React Native (Expo) client for SocialHan. The plan and phase breakdown live in
[`../MOBILE_PLAN.md`](../MOBILE_PLAN.md).

## Stack

Expo SDK 56 (dev client, not Expo Go), expo-router, NativeWind v4,
TanStack Query v5, Zustand, axios, react-hook-form + zod.

## Development

```bash
npm install
cp .env.example .env        # set EXPO_PUBLIC_API_URL to your LAN IP
npm start                   # metro bundler (requires the dev client on device)
npm run typecheck
```

The first dev client build (once per native-dependency change):

```bash
eas build --profile development --platform android
```

`google-services.json` (Firebase, phase M6) is gitignored — never commit it.
