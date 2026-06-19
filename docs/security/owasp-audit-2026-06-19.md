# OWASP Top 10 (2021) — Manual Security Audit

- **Date:** 2026-06-19
- **Scope:** SocialHan API (`api/`) + client (`client/`), `main` branch.
- **Method:** Deliberate, checklist-driven code review per OWASP Top 10 (2021),
  independent of the automated ZAP baseline scan (Phase 29.2). Each category is
  marked **PASS** (control present and adequate), **FIX** (gap to resolve before
  deploy), or **N-A** (not applicable to this app). Evidence is given as
  `file:line` references.
- **Outcome:** No FIX items. One LOW residual accepted (A05, CSP `style-src`).
  Two forward-looking NOTEs (A06 dependency scanning, A05 CSP tightening).

| # | Category | Verdict |
|---|----------|---------|
| A01 | Broken Access Control | PASS |
| A02 | Cryptographic Failures | PASS |
| A03 | Injection (incl. XSS) | PASS |
| A04 | Insecure Design / Mass Assignment | PASS |
| A05 | Security Misconfiguration | PASS (1 LOW accepted) |
| A06 | Vulnerable & Outdated Components | PASS (NOTE) |
| A07 | Identification & Authentication Failures | PASS |
| A08 | Software & Data Integrity Failures | N-A |
| A09 | Security Logging & Monitoring Failures | PASS |
| A10 | Server-Side Request Forgery (SSRF) | N-A |

---

## A01 — Broken Access Control — PASS

- Stateless JWT; `anyRequest().authenticated()` denies by default, admin area
  restricted: `/api/v1/admin/**` → `hasRole("ADMIN")`
  (`config/SecurityConfig.java:57-58`). Only `/auth/**`, the SockJS handshake
  (`/ws/**`), and `/actuator/health` are public (`SecurityConfig.java:52-56`).
- `@EnableMethodSecurity` enabled (`SecurityConfig.java:28`).
- **Object-level / IDOR:** ownership and participation are enforced at the
  manager layer using the authenticated principal, never trusting a client id:
  - DM conversations/messages gated by `verifyParticipant`
    (`manager/MessageManager.java`).
  - Post edit routes the current account id into the service
    (`manager/PostManager.java:140-142`); delete rejects non-owner non-admin:
    `if (!isAdmin() && !post.getAccount().getId().equals(current.getId())) throw new AccessDeniedException(...)`
    (`manager/PostManager.java:147-157`).
  - Reports, follows, interactions, notifications all resolve the actor via
    `getCurrentAccount()` (`manager/*Manager.java`).

## A02 — Cryptographic Failures — PASS

- Passwords hashed with BCrypt (strength 10) (`config/SecurityConfig.java:80-82`).
- Long-lived secrets are hashed at rest, never stored in plaintext: refresh
  tokens and blacklisted access tokens are SHA-256 hashed
  (`service/RefreshTokenService.java`, `service/TokenBlacklistService.java:40-44`,
  `security/TokenGenerator.hashToken`).
- Transport: HSTS `max-age=31536000; includeSubDomains`
  (`config/SecurityConfig.java:46`). Refresh-token cookie is `HttpOnly`,
  `Secure`, `SameSite=None` in prod (`application-prod.yml:41-42`).
- Fail-fast on weak secrets: in the `prod` profile the app refuses to start with
  a missing/short/default `JWT_SECRET` (and missing Cloudinary/Resend/OpenAI
  secrets when those features are enabled) — `config/EnvironmentSanityCheck.java`.

## A03 — Injection, including XSS — PASS

- **SQL:** every `@Query`/native query binds named parameters (`:userId`,
  `:recipientId`, …); no string-concatenated SQL incorporating user input and no
  dynamic `ORDER BY`/`LIKE` built from request data (repository sweep across
  `repository/*.java`). JPA/MapStruct paths are parameterized by construction.
- **XSS:** React escapes interpolated content by default and the codebase uses
  no `dangerouslySetInnerHTML`/`innerHTML` anywhere in `client/src`. Post bodies,
  bios, and DMs render as text.
- **Email HTML:** templates interpolate only server-controlled values; tokens go
  into URLs (`service/email/EmailTemplateRegistry.java`).

## A04 — Insecure Design / Mass Assignment — PASS

- All request bodies are explicit immutable `record` DTOs; no JPA entity is bound
  directly from a request. Privileged fields are not client-settable — e.g.
  `dto/account/UpdateProfileRequest` exposes only `displayName` + `bio` (no
  `role`, `id`, `email`, `password`, or `moderationStatus`); credential and email
  changes are separate, individually-guarded endpoints.
- Prod Jackson rejects unknown properties (`fail-on-unknown-properties: true`,
  `application-prod.yml:13-15`), so over-posting fails loudly.

## A05 — Security Misconfiguration — PASS (1 LOW accepted)

- Response hardening headers set centrally: CSP, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
  (`config/SecurityConfig.java:41-49`).
- Swagger UI and `/v3/api-docs` disabled in prod (`application-prod.yml:17-21`).
- CORS restricted to the `FRONTEND_ORIGIN` allowlist with a fail-closed default
  (`https://invalid-must-be-set`), explicit methods/headers, no wildcard with
  credentials (`config/SecurityConfig.java:66-77`, `application-prod.yml:33-34`).
- Error responses suppress message/stacktrace/binding/exception detail in prod
  (`application-prod.yml:23-28`).
- **LOW (accepted):** CSP allows `style-src 'unsafe-inline'`
  (`SecurityConfig.java:47-49`). Required by the current Tailwind/inline-style
  setup; XSS risk is bounded by `script-src 'self'`. Accepted residual.
- **NOTE:** consider tightening `style-src` (nonces/hashes) post-launch.

## A06 — Vulnerable & Outdated Components — PASS (NOTE)

- Current, supported framework versions (Spring Boot 3.4.x, jjwt 0.12.x, React
  19, etc.). No known-vulnerable pinned dependencies identified.
- **NOTE:** CI does not yet run automated dependency scanning. Add Dependabot
  and/or OWASP Dependency-Check as a follow-up so new CVEs surface automatically.

## A07 — Identification & Authentication Failures — PASS

- Brute-force/credential-stuffing throttled: rate limits on auth and token flows
  (`security/RateLimitAspect.java`, Phase 28.5 — now correctly returning **429**).
- Reset/verify tokens are single-use (`usedAt` set on consumption —
  `repository/PasswordResetTokenRepository.java`,
  `repository/EmailVerificationTokenRepository.java`).
- No user enumeration: password-reset request always returns 204 regardless of
  whether the email exists (`controller/AuthController.java`).
- Refresh-token rotation with family revocation on reuse
  (`service/RefreshTokenService.java`); password change/logout-all revoke
  sessions.

## A08 — Software & Data Integrity Failures — N-A

- No untrusted deserialization, no auto-update/plugin loading, no CI artifact
  consumed without provenance in the running app. Nothing applicable to assert.

## A09 — Security Logging & Monitoring Failures — PASS

- Sensitive actions recorded in an append-only audit log
  (`service/AuditLogService.java`; e.g. auth events, `BOT_POSTED`, admin actions).
- Structured Logback JSON logging; no PII or secrets logged (passwords/tokens/
  emails) per Phase 28.6 logging-hygiene pass.

## A10 — Server-Side Request Forgery (SSRF) — N-A

- The only outbound calls are to fixed, trusted hosts: Cloudinary (image upload
  via `MultipartFile` — no user-supplied URL is fetched,
  `service/CloudinaryStorageService.java:27-45`), the OpenAI moderation endpoint
  (`service/moderation/OpenAiModerator.java`), and Resend email. No feature
  fetches a server-side URL provided by a user.

---

## Follow-ups (not blockers)

- Add automated dependency scanning to CI (A06).
- Tighten CSP `style-src` away from `'unsafe-inline'` (A05).
- Complement this manual audit with the automated ZAP baseline scan (Phase 29.2)
  and record any deltas in `docs/security/known-issues.md`.
