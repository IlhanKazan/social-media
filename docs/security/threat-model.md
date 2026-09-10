# Threat Model — SocialHan

A lightweight threat model for the SocialHan platform: trust boundaries, the
assets worth protecting, and the top threats with their existing mitigations.
Companion to the manual OWASP audit (`owasp-audit-2026-06-19.md`) and the
automated ZAP scan reports.

## Trust boundaries

```
[ Browser / SPA ]  --HTTPS-->  [ API (Spring Boot) ]  --TLS-->  [ Postgres ]
       |                              |
       |                              +--HTTPS--> Cloudinary (media)
       |                              +--HTTPS--> OpenAI (moderation)
       |                              +--HTTPS--> Resend (email)
```

- **Browser ↔ API:** untrusted client. All input is validated; auth is a stateless
  JWT access token (sent as `Authorization: Bearer`) plus an `HttpOnly` refresh
  cookie. CORS is restricted to the configured `FRONTEND_ORIGIN`.
- **API ↔ Postgres:** trusted network in prod (Render private network). Access via
  JPA with parameterized queries only.
- **API ↔ third parties:** fixed, trusted hosts (Cloudinary / OpenAI / Resend).
  No user-supplied URL is fetched server-side (no SSRF surface).

## Asset inventory

| Asset | Protection |
|-------|------------|
| Passwords | BCrypt(12) hashes; never logged. Minimum 8 characters and a maximum of 72 — BCrypt's real input limit, above which it truncates silently — enforced identically on register, change and reset; the passwords that dominate credential-stuffing lists are rejected outright |
| Access tokens (JWT) | Short-lived, signed (HS256, ≥32-byte secret, fail-fast in prod); carry `typ: access`, which `JwtTokenProvider.parseAccessToken` requires — the only parse path that may authenticate a request |
| Refresh tokens | Web: `HttpOnly`+`Secure`+`SameSite` cookie. Mobile (`X-Client-Platform: mobile`): returned in the response body, stored in the OS keystore (expo-secure-store), presented in the request body — no ambient credential, so no CSRF surface and no origin check needed. Both paths: SHA-256 hashed at rest; rotated; family revoked on reuse. Minted with `typ: refresh`, so a refresh token is rejected as a bearer credential and revocation actually binds on the request path |
| User data (profiles, posts, DMs) | Authn required; ownership/participation enforced at the manager layer |
| Uploaded media | DM photos are Cloudinary `authenticated` assets via signed URLs; posts/avatars are public by design |
| Audit log | Append-only record of sensitive auth/admin/bot actions |

## Top threats and mitigations

| Threat | Vector | Mitigation |
|--------|--------|------------|
| **Token theft / replay** | XSS, network, stolen refresh cookie | `HttpOnly` cookie (JS can't read it); access token short-lived; refresh rotation + reuse-detection revokes the whole family; tokens hashed at rest. Access, refresh and MFA-challenge tokens share one signing key, so each carries a `typ` claim that the request path enforces — without it a refresh token authenticates as its subject and outlives every revocation |
| **IDOR / broken access control** | Guessing another user's resource id | Manager-layer ownership checks via the authenticated principal; DM `verifyParticipant`; `/admin/**` requires `ROLE_ADMIN` **and** an enrolled second factor |
| **XSS** | Malicious post/bio/DM content | React escapes by default; no `dangerouslySetInnerHTML`; CSP restricts `script-src` to `'self'` |
| **CSRF** | Forged state-changing request | Stateless JWT (no ambient session for normal calls); cookie-based refresh/logout additionally guarded by an Origin allowlist check |
| **Cross-site WebSocket hijacking** | Browser page opening an authenticated WS | `/ws` (SockJS, browser) restricted to the CORS origin allowlist. `/ws-native` (mobile) allows any origin because native clients send none and carry no ambient credential — the CONNECT frame must present a valid Bearer JWT, re-checked on every SUBSCRIBE/SEND |
| **Credential stuffing / brute force** | Automated login/reset attempts | Bucket4j rate limits on auth + token endpoints (429), keyed by proxy-resolved `remoteAddr` (`X-Forwarded-For` is ignored, so the bucket cannot be reset by forging headers); in-memory per instance, so the limit does not aggregate across horizontally scaled instances; no user enumeration on password reset (always 204). Second-factor guessing is capped in the database rather than by the IP bucket: five failures burn the challenge, ten per account in a rolling 15-minute window reject even a freshly issued one. Password guessing is capped the same way: ten failures lock the account for 15 minutes, independent of source IP. A locked account is indistinguishable from a wrong password and from one that does not exist; the trade-off is that a known username can be locked deliberately, accepted because the lock is short and password reset stays open |
| **SQL injection** | Crafted input in queries | JPA/MapStruct parameterized queries only; no string-built SQL or dynamic `ORDER BY` |
| **Mass assignment / privilege escalation** | Over-posting `role`/`id` fields | Explicit `record` request DTOs; no entity bound from request; prod Jackson rejects unknown properties |
| **Secret leakage / misconfig** | Weak secrets, verbose errors, open CORS | Prod fail-fast on weak `JWT_SECRET`; error detail suppressed; Swagger disabled in prod; CORS allowlist; security headers (CSP/HSTS/etc.) |
| **Abuse via bots** | AI bot accounts flooding content | Per-bot jittered cadence + daily quota; all bot posts pass moderation and are audit-logged |
| **Malicious / illegal content published** | Posting banned text before automated review completes | Fail-closed moderation: a new post is visible only to its author until it is `CLEAN`; regex pre-filter + OpenAI check run async; repeated provider failure routes to human review (`FLAGGED`), never auto-cleaned; admins remove/restore from the review queue |

## Residual risks / follow-ups

- CSP allows `style-src 'unsafe-inline'` (Tailwind) — accepted; tighten post-launch.
- Dependency scanning: Dependabot covers Maven, npm, and GitHub Actions
  weekly. OWASP Dependency-Check in CI is still a possible addition.
- DM-photo signed URLs have no hard expiry — accepted posture (see
  `known-issues.md`).
- Post images and profile fields (bio / avatar / cover) are **not yet
  moderated** — text-only for now; tracked in `known-issues.md`.
