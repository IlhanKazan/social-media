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

## OWASP ZAP scan results (2026-06-19)

Both scans (reports in this folder) ran against a local `docker compose` stack.
**0 FAIL / 0 HIGH / 0 MEDIUM** across the baseline (66 PASS) and the
authenticated API active scan (118 PASS — SQLi, XSS, Log4Shell, Spring4Shell,
RCE, SSTI, command/XML injection, path traversal, cloud-metadata all clean). Two
informational warnings, both accepted:

- **Spring Actuator Information Leak [40042]** (api-scan) — fired on
  `/actuator/health`, the **only** exposed actuator endpoint
  (`management.endpoints.web.exposure.include: health`, `show-details: never`).
  It returns just `{"status":"UP"}`; every other actuator endpoint returns 403.
  `/health` must stay public for Render's health check. **Accepted.**
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
