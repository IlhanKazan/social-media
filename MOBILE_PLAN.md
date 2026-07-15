# Mobile App Plan — SocialHan (React Native / Expo)

Ground-up React Native rewrite of the `client/` web SPA. The backend (`api/`)
stays as-is except for a few mobile-specific additions called out in
**Phase M2** and **Phase M6**. This document is the single source of truth for
the mobile track, mirroring the style of `PLAN.md`.

## Locked-in decisions

| Decision | Choice | Why |
|---|---|---|
| Tooling | **Expo (managed) + custom dev client + EAS** | FCM via config plugin, cloud builds (iOS without a Mac), OTA-friendly. Not Expo Go (native Firebase needs a dev client). |
| v1 scope | **Core MVP** | Auth (incl. MFA), feed (timeline + explore), compose + interactions, notifications + push, DMs. **No admin panel on mobile.** |
| Platforms | **Android first, iOS later** | Ship Android (test device on hand), add iOS via EAS afterwards — no code changes expected, just build/signing. |
| Styling | **NativeWind v4** | Tailwind mental model carried over from web; own the components (shadcn-style), no heavy UI lib lock-in. |

## Stack (mobile)

- **Expo SDK (latest)** + React Native + React 19, TypeScript strict.
- **expo-router** (file-based routing) or **React Navigation v7** (native stack + bottom tabs). Default: **expo-router** (less boilerplate, deep-link ready for push taps).
- **NativeWind v4** (+ `tailwind.config.js`, shared token values with web where sensible).
- **TanStack Query v5** (server state) — same patterns/keys as web.
- **Zustand v5** (auth state) — token in memory, refresh token in secure storage.
- **axios** with the same interceptor + single-flight refresh pattern as web.
- **@stomp/stompjs** over the **native WebSocket** (no SockJS in RN).
- **@react-native-firebase/app** + **/messaging** for FCM device tokens.
- **expo-secure-store** (Keychain / Keystore) for the refresh token.
- **expo-notifications** for displaying/handling local + foreground notifications.
- **date-fns**, **lucide-react-native**, **react-hook-form** + **zod** (carry over from web).

## Key architectural differences from web

### Auth: bearer + secure storage (no cookies)
The web client keeps the refresh token in an **HttpOnly cookie** (`/auth/refresh`
reads it). Cookies are fragile/blocked on mobile WebViews and irrelevant to a
native app. Mobile flips to a pure-bearer model:

- Access token → in-memory Zustand (same as web).
- Refresh token → **`expo-secure-store`** (encrypted, OS-backed).
- The API already returns `refreshToken` in `AuthResponse`; the controller only
  *strips* it for web and sets the cookie instead. Mobile needs the backend to
  **return the refresh token in the body** and **accept it from the request body
  on `/auth/refresh`** (cookie path stays for web). See **Phase M2 backend work**.
- Reuse the web's **single-flight `tryRefresh`** so concurrent 401s share one
  rotation (mirrors the fix already shipped on web).

### Realtime: STOMP over native WebSocket
`WebSocketConfig` registers `/ws` with `.withSockJS()` only. RN has no SockJS.
Add a **second, non-SockJS STOMP endpoint** (e.g. `/ws-native`) for native
clients; `@stomp/stompjs` connects directly with a `webSocketFactory` pointing at
`wss://<api>/ws-native`. Auth via the `Authorization` STOMP `connectHeader`
(already supported server-side).

### Push: FCM (new backend infra)
None exists today. Add device-token storage + Firebase Admin SDK send-path on the
backend, and FCM registration + handlers on the client. See **Phase M6**.

---

## Phases

### [ ] M0 — Prerequisites & accounts
- Create an **Expo account** + install EAS CLI (`npm i -g eas-cli`, `eas login`).
- Create a **Firebase project**; add an **Android app** (package e.g.
  `com.ilhankazan.socialhan`); download `google-services.json`.
- Generate a **Firebase service-account JSON** (for backend Admin SDK) — store as
  a Render secret, never commit.
- Decide bundle/package id and app display name.
- **Acceptance:** `eas whoami` works; Firebase project + Android app exist;
  service-account key saved to a password manager.

### [ ] M1 — Scaffold the app
- `mobile/` directory in this monorepo (sibling of `api/` and `client/`).
- `npx create-expo-app@latest` (TS template) + `npx expo install expo-dev-client`.
- Add **NativeWind v4** (`tailwind.config.js`, `metro.config.js`, `global.css`).
- Routing: **expo-router** with a `(tabs)` group: Home, Notifications, Messages, Profile.
- Folder layout mirroring web feature-folders:
  ```
  mobile/
    app/                # expo-router routes
    src/
      features/         # feed, auth, notifications, messaging, profile
      lib/              # api client, query client, storage
      stores/           # zustand (auth)
      components/        # shared UI (NativeWind)
      types/            # api.ts (mirror of backend DTOs)
  ```
- Add `VITE`-equivalent env handling via `app.config.ts` + `expo-constants`
  (`EXPO_PUBLIC_API_URL`).
- Build a **dev client**: `eas build --profile development --platform android`,
  install on device.
- **Acceptance:** dev client launches on the Android device, shows a tab bar,
  NativeWind classes render.

### [ ] M2 — Contracts, API client, auth (+ backend changes)
**Backend work (api/):**
- [ ] Add a **mobile auth path** that returns the refresh token in the response
  body instead of the cookie. Options: a `X-Client-Platform: mobile` header
  branch in `AuthController`, or dedicated `/auth/mobile/{login,register,refresh}`.
  Cleanest: keep one set of endpoints, branch on the header so web behavior is
  untouched.
- [ ] `/auth/refresh` (mobile): read the refresh token from the request body /
  `Authorization` when the cookie is absent. Reuse the existing
  `RefreshTokenService.rotate(...)` unchanged (rotation + reuse-detection apply).
- [ ] CORS / origin guard: `AuthRequestOriginGuard` is for browser CSRF; mobile
  requests have no `Origin` — ensure the mobile path is exempt (bearer-only, no
  cookie → no CSRF surface).

**Mobile work:**
- [ ] `src/types/api.ts` — mirror backend DTOs (copy from `client/src/types/api.ts`).
- [ ] `src/lib/storage.ts` — `expo-secure-store` get/set/delete for the refresh token.
- [ ] `src/lib/api.ts` — axios instance, request interceptor (Bearer), response
  interceptor with **single-flight refresh** reading/writing the secure-store token.
- [ ] `src/stores/auth-store.ts` — Zustand: `token` (memory) + `account`
  (persisted via secure-store or AsyncStorage), `login/logout/tryRefresh`.
- **Acceptance:** a manual login against staging returns tokens, refresh token
  lands in secure-store, an expired access token auto-refreshes once, logout clears it.

### [ ] M3 — Auth screens
- Login, Register, MFA challenge (TOTP/email), Forgot/Reset password (web parity).
- `react-hook-form` + `zod` (reuse schemas from web where identical).
- Auth gate: unauthenticated → auth stack; authenticated → `(tabs)`.
- **Acceptance:** full register → verify → login → MFA → land on feed loop works on device.

### [ ] M4 — Feed + compose
- Timeline + Explore tabs, infinite scroll (`useInfiniteQuery`), pull-to-refresh.
- Post card component (author, content, image, relative time, counts).
- Post detail screen; compose screen (text + image via `expo-image-picker` →
  existing Cloudinary upload endpoint).
- **Acceptance:** feed paginates, a new post appears, image upload works.

### [ ] M5 — Interactions
- Like, repost, quote-repost, reply — reuse existing mutations/endpoints.
- Optimistic updates via TanStack Query, consistent with web.
- **Acceptance:** all four interactions update counts and survive refetch.

### [ ] M6 — Notifications + FCM push (new backend infra)
**Backend work (api/):**
- [ ] Migration `V29__device_tokens.sql`: `device_tokens(id, account_id FK,
  token, platform, created_at, updated_at, deleted_at)` + unique on `token`.
- [ ] `DeviceToken` entity + repository; `POST /api/v1/devices` (register/upsert),
  `DELETE /api/v1/devices/{token}` (unregister on logout).
- [ ] Add **Firebase Admin SDK** dependency; init from the service-account secret.
- [ ] `PushNotificationService.send(accountId, payload)` → look up the user's
  device tokens, send via FCM, prune tokens FCM reports as stale.
- [ ] Hook into the existing notification flow: where the WebSocket notification
  is published, **also** enqueue an FCM push (respect a future per-user
  notification preference; default on).
**Mobile work:**
- [ ] `@react-native-firebase/app` + `/messaging` via Expo config plugin;
  drop in `google-services.json`.
- [ ] Request POST-notifications permission (Android 13+); get the FCM token;
  register it (`POST /devices`) on login; refresh on token rotation.
- [ ] Foreground messages → in-app toast/local notification (`expo-notifications`).
  Background/quit taps → deep-link to the relevant screen (post/notification/DM).
- [ ] Notifications screen (list, mark-read, mark-all-read) — web parity.
- **Acceptance:** a like/follow/reply triggers a system push on a backgrounded
  app; tapping it deep-links correctly; unregister on logout stops pushes.

### [ ] M7 — Messaging / DMs + realtime
**Backend work (api/):**
- [ ] Register a **non-SockJS** STOMP endpoint (`/ws-native`) alongside `/ws`.
**Mobile work:**
- [ ] `@stomp/stompjs` client with native `webSocketFactory` → `wss://<api>/ws-native`,
  `connectHeaders: { Authorization: Bearer <token> }`, reconnect/backoff.
- [ ] Conversation list + conversation view, optimistic send, read receipts,
  unread counts — mirror `client/src/features/messaging`.
- [ ] Reconnect on app foreground; re-auth the STOMP connection when the access
  token rotates.
- **Acceptance:** two devices exchange messages in real time; read receipts and
  unread badges update; reconnect after backgrounding works.

### [ ] M8 — Profile + settings
- Own + others' profile (header, counts, posts, follow/unfollow).
- Settings: theme, MFA management (reuse endpoints), logout (clears secure-store +
  unregisters device token).
- **Acceptance:** view/follow works; logout fully clears session and stops push.

### [ ] M9 — Build, test, distribute
- EAS build profiles: `development` (dev client), `preview` (internal APK),
  `production` (AAB for Play Store).
- Internal testing track on Play Console; gather feedback.
- iOS: add the iOS app to Firebase, `eas build --platform ios` (cloud), TestFlight.
- **Acceptance:** a production Android build installs from the Play internal track
  and runs against prod API; iOS build produced via EAS.

---

## Backend change summary (for the backend-engineer)
1. **Mobile auth path** — return refresh token in body + accept it from body on
   `/auth/refresh` (header-branch in `AuthController`); keep web cookie path intact. *(M2)*
2. **Native STOMP endpoint** — `/ws-native` without `.withSockJS()`. *(M7)*
3. **Device tokens + FCM** — migration, entity/repo, register/unregister endpoints,
   Firebase Admin SDK, `PushNotificationService`, hook into notification publish. *(M6)*

These are additive and must not change existing web behavior. Each lands on its
own `feat/mobile-*` branch with tests, per repo conventions.

## Secrets / env checklist
- Mobile: `EXPO_PUBLIC_API_URL` (staging + prod), `google-services.json` (gitignored).
- Backend: `FIREBASE_SERVICE_ACCOUNT` (JSON, Render secret) + the existing
  `EnvironmentSanityCheck` should learn about it for prod.
- EAS: Android keystore (managed by EAS), Play Console service account for submits.

## Open questions / risks
- **Monorepo type sharing:** start by copying `types/api.ts` into `mobile/`; if it
  drifts, extract a shared `packages/contracts` (npm workspace) later. Not v1-blocking.
- **expo-notifications vs react-native-firebase/messaging:** plan uses RN-Firebase
  (true FCM tokens + Admin SDK). expo-notifications is the fallback if the config
  plugin causes friction.
- **Render free tier + extra deps:** Firebase Admin SDK adds classes/heap — watch
  metaspace after M6 (we just retuned it; re-check headroom).
- **MFA on mobile:** the web MFA challenge token flow should port directly; verify
  the `purpose=mfa` token handling end-to-end on device.
