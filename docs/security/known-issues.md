# Known Security Issues — Accepted Risks

Triaged items that are accepted for launch, with rationale. Feeds the Phase 29.3
threat model.

## DM photos: authenticated delivery + signed URLs (no hard expiry)

**DM photos** are uploaded to Cloudinary as `type=authenticated` and stored as a
bare `public_id` (`messages.image_public_id`). They are **not** reachable via a
plain CDN URL — only the backend (holding `api_secret`) can mint a valid signed
delivery URL, and it only does so inside the participant-gated message responses
(`MessageMapper.signImage` → `CloudinaryStorageService.signedImageUrl`). Every read
path calls `MessageManager.verifyParticipant`, and the WebSocket broadcast targets
only the two participants.

**Residual (LOW — accepted):** signed URLs have **no hard expiry** (hard expiry
needs Cloudinary auth tokens, a paid feature). A signed URL that is *leaked after
it's minted* stays viewable — roughly equivalent to a leaked screenshot, which the
recipient could share anyway. Enabling short-expiry auth tokens later is a config
add-on.

## Post images & avatars served via unsigned public URLs (LOW — accepted)

Post images and avatars are **public content** and are delivered over standard
unsigned `secure_url`s with an unguessable `UUID` `public_id` (no enumeration). No
change planned — these are meant to be publicly viewable. Post `imageUrl` values
are validated server-side to belong to this project's Cloudinary account
(`https://res.cloudinary.com/<cloud-name>/...`), so arbitrary external URLs and
`data:` URIs are rejected at create/update.

## Content moderation: fail-closed on text, image/profile moderation deferred

Post **text** is moderated fail-closed: a new post is persisted `PENDING` and is
visible only to its author (and admins) until the async pipeline marks it `CLEAN`;
followers receive it over `/topic/feed` only on the `CLEAN` transition. A regex
pre-filter runs before the OpenAI check, and repeated provider failure ends in
`FLAGGED` (human review queue) — never an auto-pass. Admin-removed posts are hidden
from everyone including the author; admin-restored posts are treated as visible.

**Residuals (accepted for now):**

- **Post images and profile fields (bio, avatar, cover) are not moderated yet**
  (LOW–MEDIUM). Only post text is checked today; image + profile moderation is a
  planned follow-up (generic moderation engine + `omni-moderation-latest`
  multimodal). Until then, an uploaded image or bio is not automatically screened.
- **Reply notifications fire at creation time**, before the moderation decision.
  The notification carries no content preview and the linked post stays author-only
  until `CLEAN`, so a flagged reply surfaces no hidden content to the recipient
  (the link 404s for them). Gating the notification on `CLEAN` is a later refinement.
- **Provider-unavailable degrades to regex-only** (LOW). If `OPENAI_API_KEY` is
  ever missing, the OpenAI stage silently passes and only the regex list applies.
  `EnvironmentSanityCheck` requires the key in prod, so this is a defense-in-depth
  note, not an open hole.

## WebSocket revocation window (LOW — bounded)

Logout/ban revocation is enforced on the STOMP layer at CONNECT and re-verified
on every SUBSCRIBE and SEND frame (blacklist + ban, behind a 5-second in-memory
cache, so a revoked session is rejected at most ~5s after revocation once it
sends any frame). A session that stays **completely passive** — already
subscribed, sending nothing — keeps receiving broker deliveries until it
disconnects or its next inbound frame; heartbeats do not trigger the check.
Accepted: the access token itself expires in 15 minutes, which caps the passive
window.

## Actuator metrics scraping (2026-07-27 red-team pass)

`/actuator/prometheus` is publicly routed on the main port and gated by a
long-lived HTTP Basic credential (`METRICS_USERNAME` / `METRICS_PASSWORD`),
because the monitoring agent cannot carry a 15-minute JWT. The three findings
that mattered were fixed in the same pass: the credential is now compared with
a constant-time fixed-length hash instead of BCrypt cost-12 (which made every
failed attempt a ~875ms unauthenticated CPU-exhaustion lever), a 32-character
minimum is enforced at startup, and `METRICS_PASSWORD` is documented in
`.env.example` so the prod guard cannot crash-loop an otherwise-fine deploy.

The following were triaged as accepted or deferred:

- **Startup guard runs after the connector accepts traffic.** `EnvironmentSanityCheck`
  listens for `ApplicationStartedEvent`, which fires after `refreshContext()` has
  already started Tomcat, so there is a sub-second window where a misconfigured
  prod instance serves `/actuator/prometheus` with the dev credential before
  `System.exit(1)`. Fix when convenient: move the check into a `@PostConstruct`
  or the filter-chain bean so it throws during refresh, which fails closed before
  the port opens. Low severity — the window is milliseconds and requires the
  operator to have skipped the env var in the first place.
- **Anonymous requests get 403 rather than a 401 challenge.** `BasicAuthenticationEntryPoint`
  sets `WWW-Authenticate` and calls `sendError(401)`, but the resulting ERROR
  dispatch to `/error` no longer matches the prometheus `securityMatcher`, falls
  to the main chain, and is overwritten as 403. Not exploitable, and preemptive
  Basic auth (what scrapers send) works fine — but it is not RFC-7235 conformant,
  and the tests assert `isIn(401, 403)` to paper over it. Fix by adding `/error`
  to the chain's matcher, or moot it by moving actuator to a management port.
- **`jwtAuthenticationFilter` and `readOnlyModeFilter` are double-registered.**
  Both are `@Component` `Filter` beans, so Spring Boot auto-registers them at the
  servlet container on `/*` in addition to their place inside the security chain.
  `OncePerRequestFilter` dedupes and the security chain runs first (order -100),
  so this is **not** a bypass today — verified empirically. But it means the JWT
  filter executes on requests to a chain deliberately scoped to exclude it, and a
  future `@Order` on either filter would turn it into one. Fix: register
  `FilterRegistrationBean`s with `setEnabled(false)`.
- **Unexposed actuator endpoints return 500 instead of 404.** `/actuator/env`,
  `/actuator/beans` etc. are not in the exposure list, so no handler matches, and
  `NoResourceFoundException` reaches the catch-all handler. Admin-only, cosmetic,
  but it logs a full stack trace per request — a cheap log-volume amplifier on a
  disk-constrained VPS. Fix: an `@ExceptionHandler(NoResourceFoundException.class)`
  returning 404.
- **`apkUrl` has no scheme/host validation.** `MobileReleaseRequest.apkSha256` is
  `@Pattern`-validated but `apkUrl` is `@NotBlank` only. Admin-only, so this is
  post-compromise depth rather than a live hole, but a one-line
  `@Pattern(regexp = "^https://…")` would stop a compromised admin session from
  pointing the public download page at an external URL under an official-looking
  checksum.

Two questions were explicitly **not** closed by that pass and remain open:

1. Whether Cloudflare or Traefik already blocks `/actuator/*` at the edge. No
   proxy config lives in this repo, so the residual exposure of the metrics
   endpoint could not be determined from the codebase alone.
2. Whether the scraper credential comparison is free of a practical timing side
   channel. Structurally it should be (fixed-length hashes, constant-time
   compare), but the measurements taken were too noisy to demonstrate it.

## APK distribution flow (2026-07-27 red-team pass)

Probed at runtime against a live server with raw sockets. Path traversal held
against 26 encodings (Tomcat/Spring normalization catches the interesting ones
before the filename regex even runs), symlinks planted inside the releases
directory were genuinely refused, `Content-Disposition` could not be smuggled,
and a 48 MiB file streamed with no heap growth. Fixed in the same pass:
`apkUrl`/`changelogUrl` are now constrained to `https://` on this app's own
download path with length caps, `minSupportedVersionCode` cannot exceed
`latestVersionCode`, the download endpoint serves only the currently-published
filename, and `Accept-Ranges: none` stops Spring emitting a full body alongside
a 416 for a multi-range request.

Open items, in priority order:

- **Rate limits are bypassable by connecting directly to the origin (highest
  priority, infra).** `ClientIpResolver` trusts `CF-Connecting-IP`/`X-Forwarded-For`
  when the peer is in `TRUSTED_PROXY_CIDRS`, whose default is
  `10.0.0.0/8,172.16.0.0/12,192.168.0.0/16` — i.e. every Docker-network peer,
  which includes Traefik. Through Cloudflare this is safe (CF overwrites
  `CF-Connecting-IP`, which the resolver reads first). But anyone who learns the
  origin IP — certificate transparency logs, historical DNS, mail headers — can
  reach Traefik directly and forge the header, making every `@RateLimit` in the
  app unlimited. Demonstrated: 30 rotating forged IPs against a 10/hour endpoint
  all returned 200. **Fix is infra, not code:** firewall 80/443 to Cloudflare's
  published ranges (this also restores WAF/DDoS coverage generally, which is
  bypassed the same way), optionally add Authenticated Origin Pulls, and narrow
  `TRUSTED_PROXY_CIDRS` to Traefik's actual subnet.
- **Hardlinks defeat the containment check.** `NOFOLLOW_LINKS` and the
  `toRealPath()` re-check cannot detect a hardlink, because a hardlink has no
  target to resolve — a hardlinked file outside the releases directory was served
  with 200. Now unreachable in practice since only the published filename is
  served, but if that allowlist is ever relaxed the hole returns. Belt-and-braces
  fix: reject `unix:nlink > 1`, and mount the volume read-only.
- **The published SHA-256 verifies integrity, not authenticity.** The checksum is
  served from the same host and same admin panel that publishes the file, so an
  attacker who can swap the APK can recompute and republish the hash. It defends
  against a corrupted download, which TLS already largely covers. The download
  page copy was reworded to say exactly this and to point at
  `apksigner verify --print-certs`, which is bound to the EAS keystore and
  therefore is the one assertion a VPS-only attacker cannot forge. **Still to do:**
  publish the signing-certificate fingerprint somewhere outside this VPS's blast
  radius (repo README, portfolio site, GitHub Release) so there is a real
  out-of-band trust anchor.
- **The hard-block screen is a coercion lever.** Android's signature continuity
  means a VPS-only attacker cannot push an update over an existing install — but
  they could previously set `minSupportedVersionCode` arbitrarily high, rendering
  every installed app unusable behind a non-dismissable "update required" screen
  whose only affordance points at their URL. Users who then uninstall to "fix" it
  lose signature protection and install the malicious APK cleanly. The cross-field
  check now blocks the absurd-minimum case; the residual risk (an attacker
  publishing a same-host filename they planted) is bounded by the
  published-filename allowlist above. Consider showing the expected host on the
  block screen so a user can see when something is wrong.
- **APK responses are `no-store`,** because Spring Security sets it globally, so
  Cloudflare never caches the file and every download is a full origin fetch.
  Low severity on its own; it is the amplifier behind the rate-limit bypass.
  Fix: scope `.headers(h -> h.cacheControl(disable))` to the download path and set
  an explicit long `max-age` — the file is immutable and public by design.

Not verified (no VPS access): whether 80/443 is already firewalled to Cloudflare,
the production value of `TRUSTED_PROXY_CIDRS`, whether Traefik strips inbound
`CF-Connecting-IP`, filesystem permissions on the releases volume, and whether a
stale APK is currently sitting in it.

## MFA / TOTP (2026-07-27 red-team pass)

Ten scenarios driven as real HTTP against a live server. **One full MFA bypass
was found and fixed**: `startTotpSetup()` unconditionally cleared
`mfa_totp_enabled` and rotated the secret, so a stolen access token alone could
switch MFA off — bypassing the password that `disableTotp()` requires, and on a
TOTP-only account (the likely admin config) removing the second factor entirely.
It now returns 409 while TOTP is live, so re-enrolment must go through the
password-gated disable first. Also fixed in the same pass: `/auth/mfa/resend`
gated on `isMfaEnabled()` rather than `isMfaEmailEnabled()`, mailing codes to
TOTP-only users who couldn't use them, and `MFA_ENC_KEY` had a repo-published
default with no prod guard — a deploy that forgot the env var would encrypt every
TOTP seed under a key published in this repository.

Verified sound: no token is minted before the second factor (all three
token-minting paths traced); the challenge token cannot authenticate an API
request and is unforgeable and account-bound; the TOTP window is exactly ±1 step;
replay is blocked and holds under concurrency; recovery codes are single-use,
SHA-256 hashed, ~51 bits of entropy, returned exactly once and never re-readable;
the TOTP secret is AES-256-GCM encrypted at rest and never exposed after
enrolment; email codes use `SecureRandom`, are hashed, and a resend invalidates
the previous code so multiple valid codes never coexist; mobile enforces MFA
identically to web.

Open items:

- **No per-account attempt counter or lockout on `/auth/mfa/verify` (highest
  priority here).** The rate limit is IP-keyed (the caller is unauthenticated
  mid-challenge), so rotating source IPs resets it. Measured: 26 consecutive
  failures, then the correct code was still accepted. Against a ±1 window that is
  3 valid codes in 10⁶; ~80 days from a single IP but roughly two hours across a
  1,000-IP proxy pool. Fix: a per-account failure counter across all three
  methods that locks the challenge after ~5 failures and forces a fresh login,
  and key the bucket on the challenge token's subject rather than the IP.
  Compounding this, `RateLimitStore` is in-process, so every added replica
  multiplies every limit.
- **The `mfaToken` is a stateless multi-use JWT.** No server-side record, so one
  challenge token completed MFA three times in a row (three separate sessions),
  survived `logout-all`, and still worked after a password change. Fix: persist a
  challenge row (or blacklist the `jti`) consumed on first success, and invalidate
  pending challenges on password change, logout-all and MFA state change.
- **The email-OTP `MAX_ATTEMPTS = 5` cap is dead code.** `MfaEmailService` bumps
  the counter and returns false, then the caller throws in the *same* transaction,
  rolling the increment back. Measured: five wrong guesses left `attempts = 0` and
  the correct code still worked. Fix: increment in a `REQUIRES_NEW` transaction or
  a committed `@Modifying` update, with a test asserting the 6th attempt fails
  *with the correct code*.
- **Concurrent verify with one TOTP code returns 500.** Six parallel requests gave
  one 200 and five 500s (Postgres deadlock → `CannotAcquireLockException` →
  unhandled). Security-wise it fails closed — the replay guard holds — but a
  trivially triggerable 500 with a stack trace on an unauthenticated endpoint is a
  log-flood lever. Fix: lock the account row (`FOR UPDATE` or `@Version`) and map
  the lock exception to 401/429.
- **No server-side policy requires MFA for `ROLE_ADMIN`**, and `/auth/login` has no
  per-account lockout either (IP-keyed only, no failure counter) — so the
  "attacker already knows the password" precondition above is weaker than it
  looks.
- **Mobile passes the `mfaToken` as an expo-router URL param**, which lands in
  navigation state (and the address bar on a web build), unlike web which uses
  router state. Short-lived and useless without a code. Fix: pass via the auth
  store.

## OWASP ZAP scan results (2026-06-19)

Both scans (reports in this folder) ran against a local `docker compose` stack.
**0 FAIL / 0 HIGH / 0 MEDIUM** across the baseline (66 PASS) and the
authenticated API active scan (118 PASS — SQLi, XSS, Log4Shell, Spring4Shell,
RCE, SSTI, command/XML injection, path traversal, cloud-metadata all clean). Two
informational warnings, both accepted:

- **Spring Actuator Information Leak [40042]** (api-scan) — fired on
  `/actuator/health`, which at scan time was the only exposed actuator endpoint
  (`show-details: never`). It returns just `{"status":"UP"}`. `/health` must stay
  public for the platform health check. **Accepted.** Note this scan predates the
  2026-07-27 addition of `/actuator/prometheus` (see the section above); every
  actuator endpoint other than those two still returns 403 to non-admins.
- **Non-Storable Content [10049]** (baseline) — `/`, `/robots.txt`, `/sitemap.xml`
  return 403 (the API requires auth and has no public root). A caching
  informational note, not a vulnerability. **Accepted.**

### Coverage caveat (important — do not oversell)

The "0 findings" result covers the surface ZAP could actually reach, which for
the business endpoints is **shallow**. Evidence: the post count did not change
during the authenticated scan (ZAP never successfully created a post), and the
recorded alert instances sit on ZAP's own probe paths, not `/api/v1/*`. Two
things block deep authenticated coverage:

1. **The per-endpoint rate limiter** (the same one verified in Phase 28.5)
   returns 429 after a handful of requests, so ZAP's active flood is throttled
   before it can fuzz an endpoint.
2. **Bean-validated JSON bodies** — `zap-api-scan` fills request bodies with
   schema defaults that fail `@Valid` (400), so the scanner rarely reaches the
   real handler logic.

So this scan is a legitimate "no obvious vulns in the standard OWASP attack
classes on the reachable surface" signal — **not** a full authenticated pentest
of every endpoint. Stated honestly in the README/portfolio.

### Deep DAST follow-up (what a showcase-grade ZAP run needs)

Deferred (own effort, post-launch). To get real authenticated business-logic
coverage:

- Run ZAP in **daemon mode** (`zap.sh -daemon`) and drive it via its REST API
  rather than the packaged `zap-api-scan.py`.
- **Seed the session with real requests** instead of schema defaults: proxy the
  running SPA through ZAP, or import a recorded HAR / Postman collection, so each
  endpoint has a valid base request ZAP can mutate.
- **Relax the rate limiter** for the scan (a test profile that raises/disables
  `@RateLimit`, or an IP allowlist) so the active scanner isn't 429'd.
- Configure a proper **auth/session** (token refresh, since the JWT access TTL is
  15 min and an active scan can run longer).
- Pull **messages-per-URL** stats from ZAP's API as coverage evidence, and run
  the active scan at higher attack strength.
