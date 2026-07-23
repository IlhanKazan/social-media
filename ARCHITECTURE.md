# Architecture

This document describes how SocialHan is built: the backend layering, the
request and real-time lifecycles, the data model conventions, and the
cross-cutting concerns (auth, caching, rate limiting, moderation, operations).
For a feature overview and setup, see [README.md](README.md).

## System topology

```text
        Browser (React 19 SPA, nginx via Coolify)
            |  HTTPS (REST)        |  WSS (SockJS + STOMP)
            v                      v
        Cloudflare (proxy, DNS, DDoS) -> Coolify / Traefik (TLS)
            v
   +-------------------------------------------+
   |     Spring Boot API (Docker, Coolify)     |
   |                                           |
   |  Security filter chain                    |
   |   JWT filter -> read-only filter -> authz |
   |                                           |
   |  controller -> manager -> service -> repo |
   |                                           |
   |  Caffeine caches | Bucket4j rate limiter  |
   |  STOMP broker (/topic /queue /user)       |
   +-------------------------------------------+
        |                 |              |
        v                 v              v
   PostgreSQL        Cloudinary     OpenAI / Resend
   (self-hosted,     (images)       (moderation / email)
    same VPS)
```

The API is a single Spring Boot monolith. State lives in PostgreSQL; images in
Cloudinary; everything else (caches, rate-limit buckets, the STOMP broker) is
in-process, which keeps the deployment to one instance and one database.

## Backend layering

The backend enforces a strict one-directional flow:

```text
controller  ->  manager  ->  service  ->  repository
  (REST)      (boundary)    (logic)        (JPA)
```

- **controller** — thin HTTP/WebSocket handlers. Validate input, delegate, return
  DTOs. No business logic. All REST endpoints live under `/api/v1/...`.
- **manager** — the orchestration boundary. Resolves the authenticated principal,
  owns the transaction, publishes domain events, and coordinates multiple
  services. This is where "use case" logic lives (for example `AuthManager`,
  `AdminSystemManager`, `AdminOpsManager`).
- **service** — pure business logic and the only layer that talks to repositories.
- **repository** — Spring Data JPA interfaces.

DTOs are immutable Java records mapped with MapStruct; entities use Lombok because
JPA needs a no-arg constructor and mutable fields. List endpoints return a custom
`PageResponse<T>` rather than leaking Spring's `Page`. Exceptions are funneled
through a single `@RestControllerAdvice` (`GlobalExceptionHandler`) so raw stack
traces never reach clients.

### Write request lifecycle

A typical authenticated write (for example, creating a post):

1. The **security filter chain** runs: the JWT filter authenticates the bearer
   token and populates the `SecurityContext`; the read-only filter rejects writes
   with 503 if maintenance mode is on; authorization rules match the route.
2. The **rate-limit aspect** (`@RateLimit`) checks the caller's Bucket4j bucket.
3. The **controller** validates the request record (`@Valid`) and calls the manager.
4. The **manager** opens a transaction, applies domain rules via services, persists
   through repositories, and publishes events (notifications, audit, fan-out).
5. **Async listeners** handle side effects (login history, audit rows, WebSocket
   broadcasts) outside the request transaction.
6. The controller returns a DTO; `GlobalExceptionHandler` maps any failure to a
   structured error response.

## Authentication and session model

- **Access token** — short-lived JWT (jjwt 0.12), sent as a `Bearer` header,
  carrying the username, account id, and roles. Stateless; validated by the JWT
  filter on every request.
- **Refresh token** — long-lived, delivered as an `HttpOnly`, `Secure` cookie
  scoped to the auth path, never exposed to JavaScript. Because the client and API
  are cross-site on managed hosting, the cookie uses `SameSite=None`, and CSRF is
  covered by an Origin allowlist check on refresh and logout.
- **Rotation and reuse detection** — refreshing rotates the token within a token
  family; presenting a previously used token signals theft and revokes the whole
  family.
- **Blacklist** — access tokens can be invalidated before expiry (logout) via an
  in-memory blacklist.
- **Rate limiting** — sensitive endpoints (register, login, password reset) are
  guarded by Bucket4j buckets keyed by user or client IP.

Roles are `ROLE_USER`, `ROLE_ADMIN`, and `ROLE_BOT`. The first admin is granted
out-of-band by a startup runner driven by the `PROMOTE_ADMIN_USERNAME` variable.

## Real-time messaging (STOMP)

WebSocket transport is SockJS with a STOMP sub-protocol:

```text
client  --CONNECT-->  /ws            (SockJS handshake, then STOMP)
client  --SEND------>  /app/...       (application destinations)
server  --broadcast->  /topic/...     (shared streams: feed, post reactions)
server  --to-user--->  /user/queue/.. (per-user: DMs, notifications)
```

The HTTP handshake on `/ws` is permitted at the security-filter level; real
authentication happens at the STOMP `CONNECT` frame via a channel interceptor, so
only authenticated principals can subscribe to their `/user/...` destinations.
The broker is the in-memory simple broker, which suits a single instance.

## Data model and conventions

The schema is owned by immutable Flyway migrations (`V1` through `V25`); once a
migration is on `main` it is never edited — changes go in a new version.

Conventions enforced across every table:

- `snake_case` identifiers; `BIGSERIAL` primary keys (`Long` in Java).
- **Soft delete** via `deleted_at TIMESTAMPTZ` (null = active), never a status
  column. Entities extend a shared `BaseEntity` and use `@SQLRestriction`; hot
  paths have partial indexes `WHERE deleted_at IS NULL`.
- All timestamps are `TIMESTAMPTZ`; `created_at` / `updated_at` are audited.
- Case-insensitive `CITEXT` for unique username and email.
- Foreign keys are explicit about cascade behavior: user-owned content cascades,
  reference data restricts, optional links set null.

Hard deletion is deferred: a scheduled cleanup task permanently removes accounts
30 days after soft delete and purges their Cloudinary assets (profile, cover,
post, and DM images) so the erasure path matches the stated privacy policy.

## Caching

A single Caffeine `CacheManager` registers short-TTL, bounded caches for hot reads
(accounts by username, public profiles, unread notification counts, suggestions,
and system settings). TTLs are deliberately short (seconds to minutes) so stale
reads self-heal; admins can also force invalidation (see Operations).

## Rate limiting

`@RateLimit` is an AspectJ around-advice. Buckets live in `RateLimitStore`, a
bounded Caffeine cache (`maximumSize` + `expireAfterAccess`) keyed by
`user:<name>` or `ip:<addr>` plus the method — the bound prevents a flood of
distinct or spoofed `X-Forwarded-For` values from growing the store without
limit. Limiting is per-instance, which is correct while the deployment is a single
node; a shared store (Redis) would be needed to scale horizontally.

## Content moderation

User content passes a two-stage pipeline: a fast in-process regex pre-filter
catches obvious violations, and (when an OpenAI key is configured) borderline
content is checked against the moderation API with per-category thresholds. Posts
carry a `moderation_status` (`PENDING` / `CLEAN` / `FLAGGED`) and an independent
`admin_status` (`ACTIVE` / `REMOVED_BY_ADMIN` / `RESTORED_BY_ADMIN`), so automated
and human decisions are tracked separately. Flagged content surfaces in the admin
moderation queue.

## Supporting subsystems

- **Bot service** — optional seeded `ROLE_BOT` accounts post on a jittered cadence
  with daily quotas and optional active hours, producing a populated demo feed
  ("dead internet" mode). Disabled unless explicitly enabled.
- **Email** — all mail goes through a database outbox. A scheduled flusher sends
  via Resend with daily and monthly caps, marking rows SENT/FAILED and backing off
  on rate limits. Used for password reset, email verification, and welcome mail.
- **Audit log** — an append-only table records security-relevant and admin actions
  (setting changes, bans, cache invalidations, rate-limit resets) with actor, IP,
  and metadata, written asynchronously via events.

## Operations (no-restart levers)

Because a restart on a free-tier instance costs a cold start, common incidents are
handled live:

- **Read-only maintenance mode** — a system-settings toggle backed by
  `ReadOnlyModeFilter`, which returns 503 for write methods on `/api/v1/**` while
  leaving reads, auth, and admin paths open.
- **Cache invalidation and rate-limit reset** — admin endpoints under
  `/api/v1/admin/ops` clear one or all caches, or reset the rate-limit store, each
  written to the audit log.
- **Actuator diagnostics** — `metrics`, `loggers`, and `caches` are exposed but
  locked to `ROLE_ADMIN`; only `/actuator/health` is public (used by the keepalive
  ping and platform probes). `loggers` allows changing log levels live.

## Frontend architecture

State is split into three non-overlapping layers:

- **Server state** — TanStack Query owns all data fetched from the API, with array
  query keys and cache invalidation on mutation.
- **Client/auth state** — Zustand (with `persist`) holds the account; the access
  token is kept in memory and re-derived on load via a refresh call.
- **Component state** — local `useState`.

Routing (React Router v7) separates public, auth, and protected route groups. The
root `/` resolves to a marketing landing page for logged-out visitors and the feed
for authenticated ones; public content is browsable, and a soft auth gate
intercepts interaction attempts (like, reply, follow, DM) to prompt sign-up
without blocking reads. Axios runs an interceptor that attaches the access token
and transparently refreshes it; a STOMP client mirrors the server's `/topic`,
`/queue`, and `/user` destinations for live updates.

## Testing strategy

- **Backend integration tests** run against a real PostgreSQL via Testcontainers,
  exercising the full security filter chain (auth, public-viewing rules, actuator
  lockdown, rate limiting) over `TestRestTemplate`.
- **Backend unit tests** use Mockito for logic in isolation (ops manager, the
  read-only filter, schedulers).
- **Frontend tests** use Vitest with happy-dom and MSW for component and schema
  behavior.

CI gates on backend `verify` (with JaCoCo coverage floors) and frontend typecheck,
tests, and build; lint is report-only against a known baseline.
