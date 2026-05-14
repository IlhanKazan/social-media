# Master Plan — Social Media Platform (2026 Rewrite)

This is the single source of truth for the build. Tasks are sequenced by
phase. Within a phase, tasks may be parallelizable unless marked otherwise.
Each task is self-contained with explicit acceptance criteria.

This is a **clean rebuild** of an earlier 2024 portfolio project. There is
**no migration code**, no bridging old patterns. Everything starts fresh
with modern conventions.

**Status legend**
- `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Phase 5.6 — Post-V6 Retrofit + DTO Contract Fixes

This phase mirrors the spirit of 5.5 — consolidate small but real
inconsistencies introduced after V6 (`refactor_comments_to_posts`) shipped, and
close the missing-DTO-fields gap surfaced during integration. Nothing here is
new product surface; all of it is existing code that drifted from the
contract.

### [x] 5.6.1 Drop `InteractionType.COMMENT` from Java

V6 already removed `COMMENT` from the DB CHECK constraint and dropped the
`content` column. The Java enum `InteractionType` still has `COMMENT` in it
(see `entity/InteractionType.java`), and `InteractionRepository` still has a
`findCommentsByPostId` JPQL referencing the old type. Comments now live as
posts with `parent_post_id != NULL`.

- Remove `COMMENT` constant from `InteractionType` enum.
- Remove all JPQL / repository methods filtering on `InteractionType.COMMENT`.
- Audit `InteractionService` and `InteractionManager` — any remaining
  `if (type == COMMENT)` branches must go.
- `NotificationListener` (Phase 7.2) used to fire for `InteractionCreatedEvent`
  with `type=COMMENT`; this path is now driven by `PostCreatedEvent` when the
  new post has a non-null `parentPostId`. Re-route the COMMENT/REPLY
  notification fan-out accordingly. See Phase 5.6.4.

**Acceptance:** `grep -rn "InteractionType.COMMENT\|type = 'COMMENT'" api/src` returns nothing. Existing tests pass; no path produces an `Interaction` row with the old `COMMENT` type.

### [x] 5.6.2 Add `isEdited` to `PostResponse`

`PostResponse` is missing the edited-flag the frontend wants for the "Edited" badge.

- Add `boolean isEdited` to `PostResponse` (record). Computation lives in `PostMapper`: `isEdited = post.getUpdatedAt() != null && post.getUpdatedAt().isAfter(post.getCreatedAt().plusSeconds(1))`. The `+1s` tolerance avoids false positives from clock skew between the create-trigger and the audit listener.
- Mirror the field in `client/src/types/api.ts` (`PostResponse`).
- Wire a small "Edited" caption in `PostCard` (greyed text, no tooltip needed yet).

**Acceptance:** Editing a post (PATCH `/posts/{id}`) → next fetch returns `isEdited: true`. New posts return `isEdited: false`.

### [x] 5.6.3 Add `lastMessageContent` to `ConversationResponse`

The conversations list currently shows only timestamp + unread count; the frontend can't render a "last message preview" without a second round-trip per row.

- Add `String lastMessageContent` to `ConversationResponse` (record). Truncate at 80 chars server-side (`StringUtils.abbreviate`).
- Update `ConversationMapper` to populate it. Fetch strategy: extend the existing JPQL in `ConversationRepository.findByParticipantId` to also project the latest message's content via a correlated subquery, OR use a `@PostLoad`-equivalent batch fetch in the manager (single query for all conversation IDs in the page, map back). Pick whichever keeps `≤ 3 SQL queries per page` (Phase 5.5.3 rule).
- If the latest message is from the OTHER participant and unread, the frontend can show it bolded — that's a UI concern, server still just returns the raw content.
- Mirror in `types/api.ts` and update the conversations sidebar in `features/messaging/`.

**Acceptance:** Conversations list shows the last message preview without a second fetch; pagination of 20 conversations triggers ≤ 3 queries (verified via SQL log).

### [x] 5.6.4 Reply notifications routed via `PostCreatedEvent`

V6 changed comments from interactions to posts, so `InteractionCreatedEvent` no longer fires for comments. Replies now flow through `PostCreatedEvent`. The notification listener must be updated:

- In `event/NotificationListener` (or wherever `PostCreatedEvent` is consumed for notifications), branch on `parentPostId`:
  - `parentPostId == null` → no notification (top-level posts only fan out via the feed broadcaster).
  - `parentPostId != null` → fetch the parent's author. If parent author != reply author, create a `Notification(type=REPLY, recipient=parentAuthor, actor=replyAuthor, referenceId=newPostId)`. Push via WebSocket to `/user/{parentAuthorUsername}/queue/notifications`.
- The `NotificationType.COMMENT` enum value is now redundant. Either keep it as an alias for `REPLY` for migration friendliness, OR drop it and produce a follow-up V<n> migration that rewrites existing rows. Decision: **keep as alias for one release**, then remove in a later phase (lower-risk for already-issued notification rows).

**Acceptance:** Reply to someone else's post → recipient gets a notification with `type=REPLY` and a working WebSocket push. Reply to your own post → no notification.

### [x] 5.6.5 `GET /api/v1/accounts/suggestions`

The "Who to follow" right rail in the frontend is currently static. This adds a real recommendation endpoint, intentionally simple for now.

- Endpoint: `GET /api/v1/accounts/suggestions?limit=5` (default 5, max 10).
- Algorithm v1 — purely SQL, no ML:
  ```sql
  SELECT a.* FROM accounts a
  WHERE a.deleted_at IS NULL
    AND a.id != :currentUserId
    AND a.id NOT IN (
        SELECT f.following_id FROM follows f WHERE f.follower_id = :currentUserId
    )
  ORDER BY (
      SELECT COUNT(*) FROM follows f2 WHERE f2.following_id = a.id
  ) DESC, a.created_at DESC
  LIMIT :limit
  ```
  i.e. "popular accounts the current user does not yet follow". Self-excluded.
- Returns `List<PublicAccountResponse>`. `isFollowing` is always `false` by definition — keep the field anyway for client uniformity.
- Add a partial index to speed up the count subquery (already covered by `idx_follows_following`).
- Frontend: replace the static panel with a `useQuery({ queryKey: ['suggestions'], staleTime: 5 * 60 * 1000 })` (5-min stale). Each row has a one-click "Follow" button using the existing follow mutation; on success the row dims and is replaced with the next suggestion.

**Acceptance:** Endpoint returns up to 5 non-followed accounts; first call after a follow either filters the just-followed account out or invalidates the suggestions query.

### [x] 5.6.6 Rate-limiting expansion

`@RateLimit` only annotates `/auth/register` and `/auth/login` today. Several other endpoints are abuse-friendly without it:

- `POST /api/v1/posts` — 30 posts / 5 minutes per IP.
- `POST /api/v1/posts/{postId}/interactions/comments` (now: posting a reply, i.e. `POST /api/v1/posts` with `parentPostId`) — same bucket as above (the controller path is the rate boundary, not a separate counter).
- `POST /api/v1/accounts/me/avatar`, `POST /api/v1/accounts/me/cover`, `POST /api/v1/posts/upload-image` — 10 uploads / hour per IP. Cloudinary free-tier abuse protection.
- `POST /api/v1/follow/{accountId}` — 60 follow actions / 5 minutes per IP. Slows mass-follow bots.
- `@MessageMapping("/dm.send")` — 30 messages / minute per authenticated user (not IP — see note below). Implemented as a small interceptor on the inbound channel; the existing `RateLimitAspect` is HTTP-only.

**Note on key:** Auth endpoints rate-limit by IP because the user isn't authenticated yet. For all other endpoints prefer user-id when available (falling back to IP if anonymous), so that a shared NAT (campus, cafe Wi-Fi) doesn't punish all users at once. Extend `RateLimitAspect` to read `SecurityContextHolder` first and fall through to IP.

**Acceptance:** Burst tests confirm the new limits. A logged-in user under NAT can post freely while another logged-in user on the same IP also posts freely (separate buckets). Anonymous IPs share a single bucket.

### [x] 5.6.7 SecurityConfig + WebSocket CORS lockdown

Two production-blocking holes were found while auditing `SecurityConfig` and `WebSocketConfig`. Fix in this phase, before Phase 28's hardening pass touches anything else.

- **`/test.html`** is `permitAll`'d in `SecurityConfig`. The file lives under `api/src/main/resources/static/test.html` (a hand-rolled WebSocket dev tester). Two changes:
  1. Move it out of `static/` so Spring no longer serves it. Recommended: `api/src/dev-tools/ws-test.html`, kept in repo for local use, never bundled.
  2. Remove the `requestMatchers("/test.html").permitAll()` line.
- **`/ws/**` is `permitAll`** in the SecurityConfig HTTP chain. This is correct for the SockJS handshake (CONNECT auth happens in `WebSocketAuthInterceptor`), but the path matcher is too broad — it matches `/wsanything`. Replace with the precise paths the SockJS client uses: `/ws`, `/ws/**` (for sub-paths during fallback transport negotiation), and explicitly nothing else. Keep `permitAll` here, but add a comment explaining that auth is enforced by `WebSocketAuthInterceptor` at the STOMP layer.
- **`WebSocketConfig.registerStompEndpoints`** uses `setAllowedOriginPatterns("*")`. This is the WebSocket equivalent of `Access-Control-Allow-Origin: *` with credentials — exactly the combination that's a CORS exploit. Replace with `setAllowedOrigins(corsProps.allowedOrigins().toArray(new String[0]))`. The commented-out line in the current file is the right one; uncomment it and delete the `*` pattern.
- **`CorsConfigurationSource` fallback** in `SecurityConfig`: `corsProps.allowedOrigins() != null ? corsProps.allowedOrigins() : List.of("*")`. The fallback `*` combined with `setAllowCredentials(true)` is a runtime exploit if config ever degrades. Replace fallback with `List.of()` (block-by-default) and fail-fast at startup if the property is missing in `prod` profile. See 5.6.10.

**Acceptance:** `curl -H "Origin: https://evil.com" https://api.../ws/info` returns CORS-rejection headers; same call from the configured frontend origin succeeds. `/test.html` returns 404.

### [x] 5.6.8 Frontend Axios `baseURL` bug

`client/src/lib/api.ts` reads `import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'`. The fallback includes `/api/v1`, but Render config sets `VITE_API_URL=https://social-api.onrender.com` — i.e. **without** the `/api/v1` suffix. In production, `axios.post('/auth/login', ...)` becomes `https://social-api.onrender.com/auth/login`, which is 404.

- Decide one canonical form. Recommended: `VITE_API_URL` is the **origin** (no path), and the client appends `/api/v1`:
  ```ts
  const origin = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
  export const api = axios.create({ baseURL: `${origin}/api/v1`, timeout: 10000 });
  ```
- Update `.env.example` to document this convention.
- Update `lib/ws.ts` similarly: `new SockJS(\`${origin}/ws\`)`.
- Update `render.yaml` only if needed (current value is already an origin, so no change).

**Acceptance:** `npm run build` against prod env returns a working app on Render; login flow works end-to-end on the deployed URL.

### [x] 5.6.9 `application-prod.yml` hardening

Currently `application-prod.yml` is two log-level lines. It needs to be the source of truth for production overrides; right now production silently inherits dev defaults for several properties.

```yaml
logging:
  level:
    root: WARN
    com.ilhankazan.social: INFO
    org.springframework.web: WARN
    org.hibernate.SQL: WARN

spring:
  jpa:
    properties:
      hibernate:
        # Disable verbose statistics in prod
        generate_statistics: false
  jackson:
    deserialization:
      fail-on-unknown-properties: true

springdoc:
  swagger-ui:
    enabled: false
  api-docs:
    enabled: false

server:
  error:
    include-message: never
    include-stacktrace: never
    include-binding-errors: never
    include-exception: false
  forward-headers-strategy: native    # Trust X-Forwarded-* from Render's proxy

app:
  cors:
    allowed-origins:
      - ${FRONTEND_ORIGIN:https://invalid-must-be-set}    # fail-loud sentinel
```

- Disable Swagger UI + OpenAPI JSON in prod. Either drop the `permitAll` or gate the springdoc starter behind a profile-conditional bean. For portfolio purposes, keeping a read-only OpenAPI JSON behind basic auth is fine but **the default for this PR is OFF** — flip it back on later if needed.
- `forward-headers-strategy: native` is required so `X-Forwarded-Proto` and `X-Forwarded-For` from Render's edge are trusted (otherwise rate-limit-by-IP keys to the load balancer's IP, not the real client).
- The CORS sentinel default ensures a missing `FRONTEND_ORIGIN` env var doesn't silently fall back to `*`.

**Acceptance:** Boot in `prod` profile without `FRONTEND_ORIGIN` set → app fails or logs a loud warning. `/swagger-ui.html` returns 404 in prod.

### [x] 5.6.10 Fail-fast on weak JWT secret in prod

`AppProperties.JwtProperties.secret` defaults to `dev-secret-must-be-at-least-32-bytes-long-please-change`. If `JWT_SECRET` is unset on Render, the app boots with that public default and signs production tokens with a known key. This is the single highest-impact issue in the codebase.

- Add a `@PostConstruct` validator on `JwtProperties` (or a separate `@Component` `EnvironmentSanityCheck` that runs on `ApplicationReadyEvent`) that:
  1. Reads `spring.profiles.active` (or the `Environment` directly).
  2. If `prod` is active AND the secret equals the dev default OR is `< 32 bytes` → throw, fail startup.
  3. Same check for `app.cloudinary.api-secret` being blank in prod.
- Test profile keeps its own value (`application-test.yml` already does).
- Same pattern can later cover Resend API key, OpenAI API key, Gemini API key (Phases 21, 25, 27).

**Acceptance:** `SPRING_PROFILES_ACTIVE=prod ./mvnw spring-boot:run` without `JWT_SECRET` → process exits with a clear error message naming the missing var.

### [x] 5.6.11 Constrain Jackson + multipart in prod

Two small but real attack-surface tightenings:

- Multipart limits: `application.yml` already sets `max-file-size: 5MB`. Add `max-request-size: 5MB` (already present) and crucially `spring.servlet.multipart.file-size-threshold: 1MB` so files between 1–5 MB hit disk instead of memory.
- Cap request body size for non-multipart endpoints. Spring doesn't expose this directly; add a `OncePerRequestFilter` that rejects any non-multipart request whose `Content-Length` exceeds 64 KB. This protects post/comment endpoints from accidental massive bodies (the `@Size(max=500)` on content is server-side validation, but we want to reject before deserialization).
- `fail-on-unknown-properties: true` is already on. Confirm + don't regress.

**Acceptance:** `curl -X POST /api/v1/posts -d @big.json` (65 KB body) returns 413 Payload Too Large. Normal requests unaffected.

---

## Phase 11 — Frontend Auth

### [x] 11.1 Zod schemas + types

`features/auth/schemas.ts`:
```ts
export const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email().max(254),
  password: z.string().min(8).max(72),
  phone: z.string().regex(/^\+?[0-9]{10,20}$/).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;
```

### [x] 11.2 Login + Register pages

Use shadcn Form components (`Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`) wired with RHF `useForm({ resolver: zodResolver(schema) })`.

On submit: `useMutation` calls `/auth/login` or `/auth/register` → on success `useAuthStore.login(response)` + navigate to `/`.

Show server validation errors inline (response includes `fieldErrors` object from backend).

### [ ] 11.3 Auth integration test
Manual: register → log in → see `/` → refresh page → still logged in → click logout → back to `/login`.

---

## Phase 18 — DevOps

### [x] 18.1 docker-compose.yml
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: social
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
  api:
    build: ./api
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: jdbc:postgresql://postgres:5432/social
      DB_USERNAME: postgres
      DB_PASSWORD: postgres
      JWT_SECRET: ${JWT_SECRET}
      CLOUDINARY_CLOUD_NAME: ${CLOUDINARY_CLOUD_NAME}
      CLOUDINARY_API_KEY: ${CLOUDINARY_API_KEY}
      CLOUDINARY_API_SECRET: ${CLOUDINARY_API_SECRET}
      SPRING_PROFILES_ACTIVE: local
    ports: ["8080:8080"]
volumes:
  postgres_data:
```

### [x] 18.2 api/Dockerfile (multi-stage, optimized)
```dockerfile
# Build
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B clean package -DskipTests

# Runtime
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
RUN addgroup --system app && adduser --system --ingroup app app
COPY --from=build /app/target/*.jar app.jar
RUN chown -R app:app /app
USER app
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:8080/actuator/health | grep -q UP || exit 1
ENTRYPOINT ["java","-XX:+UseZGC","-XX:MaxRAMPercentage=75","-jar","app.jar"]
```

### [ ] 18.3 render.yaml
```yaml
services:
  - type: web
    name: social-api
    runtime: docker
    rootDir: api
    plan: free
    healthCheckPath: /actuator/health
    envVars:
      - key: SPRING_PROFILES_ACTIVE
        value: prod
      - key: JWT_SECRET
        sync: false
      - key: CLOUDINARY_CLOUD_NAME
        sync: false
      - key: CLOUDINARY_API_KEY
        sync: false
      - key: CLOUDINARY_API_SECRET
        sync: false
      - key: DATABASE_URL
        fromDatabase:
          name: social-db
          property: connectionString
  - type: web
    name: social-client
    runtime: static
    rootDir: client
    buildCommand: npm ci && npm run build
    staticPublishPath: dist
    envVars:
      - key: VITE_API_URL
        value: https://social-api.onrender.com
    routes:
      - type: rewrite
        source: /*
        destination: /index.html

databases:
  - name: social-db
    plan: free
    postgresMajorVersion: "16"
```

### [x] 18.4 GitHub Actions CI
`.github/workflows/ci.yml`:
- Trigger: PR + push to main
- Job `api`: setup-java@v4 (temurin 21), cache `~/.m2`, `cd api && ./mvnw -B verify`
- Job `client`: setup-node@v4 (20), cache npm, `cd client && npm ci && npm run typecheck && npm run lint && npm run build`

### [x] 18.5 .env.example finalized
List every required env var with description.

---

## Phase 20 — Backend Polish II (Caching, Cursor Pagination, Audit Log)

This phase ships three orthogonal backend improvements that PLAN-1 deferred:
- A small in-process cache for hot read endpoints (Caffeine).
- Cursor-based pagination for message threads (replacing offset, which is
  unsound for a write-heavy timeline).
- An append-only audit log table for sensitive admin/auth actions.

Each is an independent task; they can land in any order.

### [x] 20.1 Caffeine in-process cache

Render free tier is single-instance, so Caffeine is sufficient — no Redis. If
we ever scale horizontally, every cached read must be re-evaluated; the
spring-cache abstraction makes this swap trivial.

- Add dependency: `org.springframework.boot:spring-boot-starter-cache` and
  `com.github.ben-manes.caffeine:caffeine` (already-managed by Spring Boot's
  BOM, omit version).
- `@EnableCaching` on the application class.
- `config/CacheConfig.java`: `CaffeineCacheManager` with named caches:
  - `accountsByUsername` — TTL 60s, max 1000 entries.
  - `publicProfilesByUsername` — TTL 30s, max 1000 entries.
  - `unreadNotificationCount` — TTL 5s, max 1000 entries (per-user counter).
  - `suggestions` — TTL 5min, max 1000 entries (Phase 5.6.5).
- Annotate read paths in the **service** layer:
  - `AccountService.findByUsername(...)` → `@Cacheable("accountsByUsername")`.
  - `AccountService.getPublicProfile(...)` → `@Cacheable("publicProfilesByUsername")`.
  - `NotificationService.countUnread(...)` → `@Cacheable("unreadNotificationCount")`.
- Annotate writes with `@CacheEvict` so updates invalidate. Profile updates
  evict both `accountsByUsername` and `publicProfilesByUsername` keyed by
  the username being updated. Mark-as-read evicts `unreadNotificationCount`
  for that user.
- **Hard rule:** never cache anything user-specific keyed only on a non-user
  argument — always include the caller's user id in the key (or use a
  separate cache name per caller-context).

**Acceptance:** Repeated `GET /accounts/{username}` within a second triggers exactly one DB query (verified via SQL log). Profile update invalidates the cache and the next GET re-queries.

### [x] 20.2 Cursor pagination for `/conversations/{id}/messages`

Offset pagination with concurrent inserts produces duplicates and gaps when
new messages arrive while the user scrolls. Cursor avoids both.

- Add a new endpoint variant: `GET /api/v1/conversations/{id}/messages?before=<messageId>&size=20` — returns up to `size` messages **older than** `before` (i.e. `id < before`), newest first. If `before` is omitted, returns the latest page.
- Keep the offset-based endpoint working for one release (cross-stack rollout safety) but mark `@Deprecated` and log a warning when it's hit.
- DTO: `CursorPageResponse<T>(List<T> content, Long nextCursor, boolean hasMore)`. `nextCursor` is the smallest `id` in the current page, or `null` if `!hasMore`.
- Repository:
  ```java
  @Query("""
      SELECT m FROM Message m
      WHERE m.conversation.id = :conversationId
        AND (:before IS NULL OR m.id < :before)
      ORDER BY m.id DESC
  """)
  List<Message> findThreadPage(@Param("conversationId") Long conversationId,
                                @Param("before") Long before,
                                Pageable pageable);
  ```
  Use `Pageable.ofSize(size)` only for the limit — sort is in JPQL.
- Frontend: switch `useInfiniteQuery` for messages to use `getNextPageParam: (last) => last.nextCursor`. The hook already uses `useInfiniteQuery`, so this is a per-page-shape change.

**Acceptance:** Send 50 messages while a user scrolls back through history; no duplicates, no gaps. Loading 5 pages of 20 messages issues 5 SQL queries with monotonically decreasing `id` cursors.

### [x] 20.3 Audit log

Append-only table for security-relevant events. Used by admins (Phase 26) for
incident review. Distinct from `LoginHistory` (Phase 5.5.5) which is just
successful-login telemetry.

- Migration `V<n>__audit_log.sql`:
  ```sql
  CREATE TABLE audit_log (
      id BIGSERIAL PRIMARY KEY,
      actor_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
      actor_username CITEXT,                       -- denormalized for post-deletion forensics
      action VARCHAR(64) NOT NULL,                 -- e.g. POST_REMOVED_BY_ADMIN, USER_BANNED, REGISTRATION_TOGGLED
      target_type VARCHAR(32),                     -- e.g. POST, ACCOUNT, REPORT, SYSTEM
      target_id BIGINT,
      metadata JSONB,                              -- arbitrary structured context
      ip_address INET,
      user_agent VARCHAR(500),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_audit_log_actor ON audit_log(actor_id, created_at DESC);
  CREATE INDEX idx_audit_log_target ON audit_log(target_type, target_id, created_at DESC);
  CREATE INDEX idx_audit_log_action ON audit_log(action, created_at DESC);
  ```
- `entity/AuditLog`: plain `@Entity`, no BaseEntity (append-only, no `updated_at`, no soft delete).
- `service/AuditLogService.record(action, targetType, targetId, metadata)` — reads actor + IP + UA from `RequestContextHolder`. Async (`@Async`) — never blocks the action it records.
- Wire callers (initial set):
  - Token reuse detected (Phase 5.5.7) → `TOKEN_REUSE_DETECTED`.
  - Logout-all → `LOGOUT_ALL`.
  - Admin actions (Phase 26): `POST_REMOVED_BY_ADMIN`, `USER_BANNED`, `USER_UNBANNED`, `REGISTRATION_TOGGLED`, `REPORT_RESOLVED`.
  - Email-verification flag flipped → `EMAIL_VERIFIED`.
- Retention: keep forever for now. A scheduled cleanup beyond 1 year can come later.

**Acceptance:** Banning a user (Phase 26) creates an audit row with the correct actor, target, and metadata; the row is visible to admins via the admin endpoint added in 26.

---

## Phase 21 — Email Infrastructure (Resend)

Resend is the email provider. This phase wires the SDK, builds an outbox
that respects free-tier limits, and adds the first transactional template
(welcome email). All subsequent email features (password reset, verification,
admin alerts) build on this.

**Free-tier budget (the hard ceiling):**
- 3,000 emails / month
- 100 emails / day
- 1 verified domain
- 5 requests / second to the API

The outbox + throttler must keep us comfortably under these. Mock data
seeders never send mail. Bot accounts (Phase 27) never receive mail.

### [x] 21.1 Resend SDK + config

- Add dependency: `com.resend:resend-java:4.x` (verify latest stable on Maven Central before pinning).
- `app.email.*` config block:
  ```yaml
  app:
    email:
      enabled: ${EMAIL_ENABLED:false}              # off in local + test by default
      provider: resend                              # future-proof for SMTP fallback
      from-address: ${EMAIL_FROM:noreply@yourdomain.com}
      from-name: ${EMAIL_FROM_NAME:MicroBlog}
      resend-api-key: ${RESEND_API_KEY:}
      daily-cap: ${EMAIL_DAILY_CAP:90}              # 90 < Resend's 100 — hard floor
      monthly-cap: ${EMAIL_MONTHLY_CAP:2800}        # 2800 < 3000 — hard floor
  ```
- `EmailProperties` `@ConfigurationProperties` record.
- `config/ResendConfig.java`: `@Bean Resend resend()` — builds with the API key. Skip bean creation if `app.email.enabled = false` (so local dev doesn't need a key).

### [x] 21.2 Email outbox table + entity

Resend's per-second rate-limit and per-day cap mean we cannot send mail
inline from request threads. Persist intent → flush asynchronously.

- Migration `V<n>__email_outbox.sql`:
  ```sql
  CREATE TABLE email_outbox (
      id BIGSERIAL PRIMARY KEY,
      to_address VARCHAR(254) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      body_html TEXT NOT NULL,
      body_text TEXT,
      template VARCHAR(64) NOT NULL,                -- e.g. WELCOME, PASSWORD_RESET, EMAIL_VERIFICATION
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',-- PENDING, SENT, FAILED, SKIPPED
      attempts INT NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      sent_at TIMESTAMPTZ,
      provider_message_id VARCHAR(255)
  );

  CREATE INDEX idx_email_outbox_pending ON email_outbox(created_at)
      WHERE status = 'PENDING';
  CREATE INDEX idx_email_outbox_sent_per_day ON email_outbox(sent_at)
      WHERE status = 'SENT';
  ```
- `entity/EmailOutbox`: plain `@Entity`, no BaseEntity. `EmailStatus` enum.
- `repository/EmailOutboxRepository`:
  - `List<EmailOutbox> findTop10ByStatusOrderByCreatedAtAsc(EmailStatus status)` — for the flusher.
  - `long countByStatusAndSentAtAfter(EmailStatus s, Instant since)` — used for the cap checks.

### [x] 21.3 Email service + templating

- `service/EmailService` (interface + `ResendEmailService impl`):
  - `enqueue(EmailMessage msg)` — inserts a row into outbox with `status=PENDING`. Returns the row id. **Always** the public entry point — no caller bypasses the outbox.
  - `EmailMessage` is a record with `to`, `subject`, `template`, `templateParams (Map<String,Object>)`. Body HTML/text is rendered at enqueue time, not at send time, so the outbox row is fully self-contained.
- Templates: a tiny in-Java template registry with `{{placeholder}}` substitution — no Thymeleaf dependency for now. Put templates in `src/main/resources/email-templates/<name>.html` and load on startup.
- `WelcomeEmailTemplate`, `PasswordResetEmailTemplate`, `EmailVerificationTemplate`, `AdminAlertEmailTemplate` — the four needed across the next phases. Each is a small class implementing `EmailTemplate` with the placeholder map. Subject + html + text variants per template.
- All emails include a footer with: app name, "you're receiving this because…", and (where applicable) an unsubscribe note. Welcome and admin-alert emails ship without an unsubscribe link by design (transactional).

### [x] 21.4 Outbox flusher + caps

- `scheduler/EmailOutboxFlusher` `@Scheduled(fixedDelay = 5000)` (every 5s).
  Locking: a Postgres advisory lock keyed on a constant (`SELECT pg_try_advisory_lock(7421)`) — only one instance flushes at a time. (Belt-and-braces; we're single-instance today, but cheap insurance.)
- Each tick:
  1. Check daily cap: `count(status=SENT AND sent_at > now() - 24h)` — if `>= dailyCap`, log warn and return without sending.
  2. Check monthly cap: same against 30d. Same behavior.
  3. Pull up to 10 PENDING rows.
  4. For each row, call Resend. On 200 → mark SENT, store `provider_message_id`. On 429 → leave PENDING, increment attempts (so we back off via the next tick). On 4xx other than 429 → mark FAILED, store `last_error`. On 5xx / network → leave PENDING, increment attempts.
  5. Throttle: max 4 sends per tick (≤ 1 send/sec — well below Resend's 5/sec).
- A "skip" path: if `attempts >= 5`, mark `SKIPPED` so we don't burn the daily cap on a known-bad address.
- Disable the scheduler entirely when `app.email.enabled=false`.

**Acceptance:** Enqueueing 200 emails in a burst sends them at ≤ 1/sec, hits the daily cap at 90, and queues the rest until tomorrow. Killing the API mid-flush and restarting does not double-send any mail (Resend's idempotency key on the request prevents duplicates; pass `IDEMPOTENCY_KEY = outbox_row_id` in the API call).

### [x] 21.5 Welcome email (first hookup)

- In `AuthManager.register(...)`, after the new account is persisted and the auth response is built, **enqueue** a welcome email. The transaction commits first (outbox row writes use the same transaction; if the user creation rolls back, the welcome email never enqueues). Then a `@TransactionalEventListener(AFTER_COMMIT)` on `UserRegisteredEvent` is the cleaner mechanism — wire it through that listener.
- Template: short and plain. App name, the user's display name, a "what next" line ("post your first thought" linked to `/`).
- No PII beyond the user's username + email is included.

**Acceptance:** Register a new user → row appears in `email_outbox` → next flusher tick sends → user's inbox receives the welcome email within ~10 seconds. With `app.email.enabled=false` (default in local), the row is created but never sent.

---

## Phase 22 — Password Reset Flow

Builds on Phase 21. Token-based reset with strict TTL, single-use, hashed
storage, and consistent rate limiting on both the request and the consume
endpoint.

### [x] 22.1 Reset-token table + entity

- Migration `V<n>__password_reset_tokens.sql`:
  ```sql
  CREATE TABLE password_reset_tokens (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      token_hash CHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      requested_ip INET,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_password_reset_tokens_account_active
      ON password_reset_tokens(account_id) WHERE used_at IS NULL;
  ```
- `entity/PasswordResetToken`: plain `@Entity`, no BaseEntity.

### [x] 22.2 Backend endpoints

- `POST /api/v1/auth/password-reset/request` — body `{ email }`. Always returns 204 (no leak of whether email exists). Rate limit: 3 / hour / IP. If the email exists:
  1. Invalidate any active reset tokens for that account (`UPDATE ... SET used_at = NOW() WHERE used_at IS NULL` — only one live reset link per account).
  2. Generate a 256-bit random secret. Store SHA-256 hash. Set `expires_at = NOW() + 30 minutes`.
  3. Enqueue email with the plaintext token in the URL: `${FRONTEND_ORIGIN}/reset-password?token=<plaintext>`.
- `POST /api/v1/auth/password-reset/confirm` — body `{ token, newPassword }`. Rate limit: 5 / hour / IP.
  1. Hash incoming token, look up. If not found → 400.
  2. If `used_at != NULL` → 400.
  3. If `expires_at < NOW()` → 400.
  4. Validate `newPassword` (same Zod rules as registration).
  5. BCrypt-hash, update `accounts.password`. Set `used_at = NOW()` on the token. Inside same transaction, **revoke all refresh tokens for the account** (Phase 5.5.7's `revokeAllForAccount`) and add the current access token to the blacklist if presented (it usually won't be — the user is logged out).
  6. Emit audit log entry `PASSWORD_RESET`.
  7. Return 204.
- DTOs: `PasswordResetRequest(@Email String email)`, `PasswordResetConfirmRequest(String token, @Size(min=8,max=72) String newPassword)`.
- Cleanup: existing refresh-token cleanup job extended to also delete reset tokens older than 7 days past expiry.

### [x] 22.3 Frontend pages

- Public route `/forgot-password` (under `<AuthLayout>`). Single email input + submit. After submit show a generic success message ("If an account exists for that email, a reset link has been sent.").
- Public route `/reset-password` reads `?token=` from URL. Two password inputs (new + confirm). On submit, call confirm endpoint. On success → redirect to `/login` with a sonner toast "Password updated, please log in".
- Wire both into `routes/index.tsx`.
- Add a "Forgot password?" link on the login form.

**Acceptance:** End-to-end happy path: user clicks "forgot password" → receives email → clicks link → enters new password → can log in with the new password. Old refresh tokens are dead. Requesting a reset for a nonexistent email returns 204 with no observable side effect (no row, no mail).

---

## Phase 23 — Email Verification + Verified Badge

**Decision:** opt-in. Users can sign up and use the app immediately. They can
verify their email later from Settings. Verified accounts get a small badge
(check-mark icon) on their profile and in PostCard. Nothing is gated by
verification status today, but the column is in place if we want to gate
admin actions or rate limits later.

### [x] 23.1 Schema additions

- Migration `V<n>__email_verification.sql`:
  ```sql
  ALTER TABLE accounts
      ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN email_verified_at TIMESTAMPTZ;

  CREATE TABLE email_verification_tokens (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      token_hash CHAR(64) NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX idx_email_verification_account_active
      ON email_verification_tokens(account_id) WHERE used_at IS NULL;
  ```
- Update `Account` entity: `Boolean emailVerified`, `Instant emailVerifiedAt`.
- Update `MyAccountResponse` and `PublicAccountResponse` to expose `emailVerified` (the public response only — never the verifiedAt timestamp).

### [x] 23.2 Backend endpoints

- `POST /api/v1/accounts/me/email/send-verification` — auth-required. Rate limit: 3 / hour / user. Skipped if `emailVerified == true`. Generates token, enqueues an email like password reset.
- `POST /api/v1/accounts/me/email/verify` — body `{ token }`. Rate limit: 5 / hour / IP. Verifies token, flips `email_verified = true`, sets `email_verified_at`, marks token used. Audit log `EMAIL_VERIFIED`.
- DTOs as needed.
- Token TTL: 24 hours (longer than reset because the link goes to a real human inbox without urgency).

### [x] 23.3 Frontend integration

- Settings page: "Email verification" section. If unverified, show a button "Send verification email". Disabled with a countdown if rate-limited (response 429 includes Retry-After, optional). After click, show "Check your inbox" state.
- Public `/verify-email?token=` route — calls the verify endpoint, shows success or error.
- Verified badge: in `PublicAccountResponse`, frontend shows a small `<CheckCircle />` from lucide next to the displayName when `emailVerified === true`. Same in `PostCard`'s author row.
- No flow gates verification today. (Admins can enable a "verified-only posting" mode later via a system flag — Phase 26.)

**Acceptance:** New users start unverified, see no badge. After verification flow, badge appears everywhere their account is shown. No part of the app blocks unverified users from any action.

---

## Phase 24 — Repost / Quote-Repost

Twitter-style: a user can either re-share another user's post verbatim
(simple repost) or quote it with their own commentary (quote-repost).

### [x] 24.1 Schema

- Migration `V<n>__reposts.sql`:
  ```sql
  -- Simple reposts: a separate table to keep posts.* clean and avoid mixing
  -- "this is a real post" with "this is a pointer to a real post"
  CREATE TABLE reposts (
      id BIGSERIAL PRIMARY KEY,
      account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      UNIQUE(account_id, post_id)
  );

  CREATE INDEX idx_reposts_by_account ON reposts(account_id, created_at DESC)
      WHERE deleted_at IS NULL;
  CREATE INDEX idx_reposts_by_post ON reposts(post_id) WHERE deleted_at IS NULL;

  -- Quote reposts ARE posts, just with a pointer to the quoted post.
  -- parent_post_id keeps reply semantics; quoted_post_id is new.
  ALTER TABLE posts
      ADD COLUMN quoted_post_id BIGINT REFERENCES posts(id) ON DELETE SET NULL;

  CREATE INDEX idx_posts_quoting ON posts(quoted_post_id, created_at DESC)
      WHERE quoted_post_id IS NOT NULL AND deleted_at IS NULL;
  ```
- A simple repost = row in `reposts`. A quote-repost = row in `posts` with `quoted_post_id != NULL` (and may also have content + image).
- The two are distinct because their feed semantics differ: a simple repost shows the original post in the reposter's profile/feed without altering it; a quote-repost is its own post that *embeds* the quoted post.

### [x] 24.2 Backend entities + DTOs

- `entity/Repost extends BaseEntity`-like minimal entity (has `deletedAt` for soft-delete; no `updatedAt` since reposts aren't edited).
- Update `Post` entity: `@ManyToOne(fetch=LAZY) Post quotedPost`.
- Update `PostResponse` (record):
  - Add `PostResponse quotedPost` (nullable, recursive type — flatten one level only, not the entire chain).
  - Add `long repostCount`, `boolean repostedByMe`.
  - Counts and `repostedByMe` come from the same batched query that already does likes/dislikes (Phase 5.5.3 pattern).
- New DTO `CreateQuoteRepostRequest(@Size(max=500) String content, String imageUrl, @NotNull Long quotedPostId)` — endpoint shares the same controller surface as create-post but the validation differs (`content` may be empty for a quote with image).
- `RepostMapper` (MapStruct) — for the simple-repost DTO when listing reposts.

### [x] 24.3 Endpoints

- `POST /api/v1/posts/{id}/repost` — toggle simple repost. 201 on first call (created), 204 on second call (un-reposted). Rate limit shared with post creation.
- `POST /api/v1/posts/{id}/quote-repost` — body `CreateQuoteRepostRequest`. Returns the new `PostResponse`.
- Profile feed (`GET /by-user/{username}`) is now a **union**: their own posts (including quote-reposts) + their reposts. Feed items returned with a discriminator (`type: "POST" | "REPOST"`). Reposts include the `repostedAt` timestamp (used for ordering in the user's profile) plus the underlying `PostResponse`.
- Following feed (`GET /feed`) likewise includes reposts from followed accounts.
- New endpoint: `GET /api/v1/posts/{id}/quotes?page=&size=` — list of posts that quote this post.

### [x] 24.4 Notifications + WebSocket

- New `NotificationType.REPOST` and `NotificationType.QUOTE_REPOST`.
- A simple repost notifies the original author (skip if self-repost).
- A quote-repost notifies the quoted post's author (skip if self-quote).
- Both fire over the existing `/user/{username}/queue/notifications` channel.
- A repost or quote-repost broadcast to `/topic/feed` so it shows up in real-time for followers (same flow as `PostCreatedEvent`). Add a `RepostCreatedEvent`.

### [x] 24.5 Frontend

- Replace the disabled `Repeat2` icon in `PostCard` (Phase 16.3 removed the click handler; this restores it).
- Click → shadcn `<DropdownMenu>` with two items: "Repost" and "Quote".
- "Repost" → optimistic toggle of `repostedByMe`, mutation calls the toggle endpoint. Sonner toast "Reposted".
- "Quote" → opens a `<Dialog>` containing a mini-composer with the quoted post embedded as a read-only card below the textarea. Submit creates a quote-repost.
- Update `PostCard` rendering: when `quotedPost != null`, render the quoted post as a smaller embedded card (no nested embed — show only first level of quote chain).
- Profile feed: items rendered as `<PostCard>` directly, with a small "🔁 reposted by @username" header strip on repost items.
- Real-time: existing feed subscription already handles new posts; add a simple-repost handler to invalidate the relevant profile feed query. (Reposts on `/topic/feed` are scoped to followers anyway, same as posts.)

**Acceptance:** Repost from user A → user B's "Following" feed shows it with a "reposted by @A" header. Un-repost → it disappears. Quote-repost → it appears as a new post with the quoted post embedded. Quote chain depth is capped at 1 (a quote of a quote shows the inner quote as a non-embedded link — "↗ quoted post by @x" — to avoid recursive bloat).

---

## Phase 25 — AI Content Moderation (Full Scope)

The user-facing intent is "ship a real moderation pipeline like X / Bluesky:
new posts run through automated checks, flagged content is hidden from the
feed, admins review the queue, users can report content."

**Provider choice:** OpenAI Moderation API (`omni-moderation-latest`).
- **Free** for any OpenAI API account (no credits required for the moderation endpoint).
- Multilingual (Turkish included).
- Categories: sexual, sexual/minors, hate, hate/threatening, harassment, harassment/threatening, self-harm, self-harm/intent, self-harm/instructions, violence, violence/graphic.
- Multimodal (text + image) — handy when post-images land.
- Replaces the original Notion plan's `unitary/toxic-bert` (English-leaning,
  HuggingFace inference rate limits unstable for production).
- A regex-based pre-filter for the very obvious cases (hard slurs we always
  block) runs first, so most posts skip the API call entirely.

### [x] 25.1 Schema additions

- Migration `V<n>__moderation_columns.sql`:
  ```sql
  ALTER TABLE posts
      ADD COLUMN moderation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
          CHECK (moderation_status IN ('PENDING', 'CLEAN', 'FLAGGED')),
      ADD COLUMN admin_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
          CHECK (admin_status IN ('ACTIVE', 'REMOVED_BY_ADMIN', 'RESTORED_BY_ADMIN')),
      ADD COLUMN moderated_at TIMESTAMPTZ,
      ADD COLUMN moderation_categories JSONB,           -- raw scores from provider
      ADD COLUMN moderation_provider VARCHAR(32);

  -- Hot path: feed query needs to skip flagged + removed quickly
  CREATE INDEX idx_posts_visible_feed ON posts(created_at DESC)
      WHERE deleted_at IS NULL
        AND moderation_status IN ('PENDING', 'CLEAN')
        AND admin_status = 'ACTIVE';

  -- Admin review queue
  CREATE INDEX idx_posts_moderation_queue ON posts(created_at ASC)
      WHERE moderation_status = 'FLAGGED' AND deleted_at IS NULL;

  CREATE TABLE reports (
      id BIGSERIAL PRIMARY KEY,
      post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      reporter_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      reason VARCHAR(64) NOT NULL,                   -- HATE, HARASSMENT, SPAM, OTHER, ...
      details VARCHAR(500),
      resolved_at TIMESTAMPTZ,
      resolved_by_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL,
      resolution VARCHAR(32),                        -- DISMISSED, POST_REMOVED, USER_BANNED
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(post_id, reporter_id)                   -- one report per (post, reporter)
  );

  CREATE INDEX idx_reports_unresolved ON reports(created_at ASC) WHERE resolved_at IS NULL;
  ```
- Discriminator semantics:
  - `moderation_status` is the AI's verdict (PENDING / CLEAN / FLAGGED).
  - `admin_status` is the human override (ACTIVE / REMOVED_BY_ADMIN / RESTORED_BY_ADMIN). RESTORED is distinct from ACTIVE so we have an audit trail of "an admin saw this and chose to keep it" — this also overrides any future re-flag attempt by the AI.
- Visible posts in the public feed = `deleted_at IS NULL AND admin_status = 'ACTIVE' AND moderation_status IN ('PENDING','CLEAN')`. PENDING is shown optimistically; if the AI flags it post-hoc, the broadcast invalidator (see 25.4) yanks it from the feed.

### [x] 25.2 Moderation service

- `service/moderation/ContentModerator` (interface):
  ```java
  ModerationResult moderate(String text, List<String> imageUrls);
  ```
  `ModerationResult` is a record `(boolean flagged, Map<String,Double> categoryScores, String provider)`.
- Implementations:
  - `RegexPreFilter` — checks against a configurable list of slurs / blocked terms. If any match → return `flagged=true, provider="REGEX"` immediately, skip the API call.
  - `OpenAiModerator` — POSTs to `https://api.openai.com/v1/moderations` with `model: "omni-moderation-latest"`, parses the response. Threshold: any category with score `> 0.7` flips the post to FLAGGED. Threshold per category configurable in `app.moderation.thresholds.*`.
- A `CompositeModerator` runs RegexPreFilter first, then OpenAI if not already flagged. The result is the merged categoryScores map.
- Failure mode: if the provider call fails (timeout, 5xx, rate limit), the post stays at `moderation_status=PENDING`. A scheduled retry job (5 min cadence, max 3 attempts) re-tries PENDING posts older than 60 seconds. After 3 failed attempts, mark CLEAN and log a warn — we'd rather show a post than block a user indefinitely on a provider hiccup.
- Config:
  ```yaml
  app:
    moderation:
      enabled: ${MODERATION_ENABLED:true}
      openai-api-key: ${OPENAI_API_KEY:}
      threshold-default: 0.7
      thresholds:
        hate: 0.5
        violence: 0.7
        sexual_minors: 0.0          # zero-tolerance
  ```
  When `MODERATION_ENABLED=false`, every post auto-passes to `CLEAN` — local dev needs no API key.

### [x] 25.3 Async pipeline + event flow

- New `event/PostNeedsModerationEvent` published from `PostManager.create(...)` after persistence.
- `@Async` listener `ContentModerationListener` runs the moderator and updates the post's `moderation_status`, `moderation_categories`, `moderated_at`, `moderation_provider`.
- After the update commits, publish `PostModerationDecidedEvent`. Two listeners:
  1. `ModerationFeedInvalidator` — if the post just flipped to FLAGGED, broadcast a `POST_REMOVED` message on `/topic/feed` (frontend removes it from any list it appears in). If it was CLEAN, broadcast `POST_VISIBLE` (frontend adds the green ✓ badge if we want one — optional).
  2. `ModerationUserNotifier` — if FLAGGED, push to `/user/{authorUsername}/queue/notifications` a `MODERATION` notification: "Your post was held for review. An admin will look at it shortly." Persist as `Notification(type=MODERATION, recipient=author)`.
- For the user notification, deliberately do NOT echo back the AI's category scores — vague is fine.

### [x] 25.4 User-facing reporting

- `POST /api/v1/posts/{id}/report` — body `{ reason, details? }`. Rate limit: 10 reports / hour / user. UNIQUE constraint already prevents double-reporting the same post.
- `GET /api/v1/me/reports` — list of reports the current user has filed (so they can see the resolution).
- Frontend: `<DropdownMenu>` on each post (already added in Phase 16.3) gets a new "Report" item. Opens a small dialog with reason buttons (Hate, Harassment, Spam, Self-harm, Other) and an optional details textarea. Submit → toast "Thanks, we'll review."

### [x] 25.5 Spam-burst alert

When several posts flip to FLAGGED in a short window, mail admins.

- Sliding-window counter: count `FLAGGED` posts created in the last 10 minutes. If `> 20`, send an admin alert email (single email per 30-min window — debounce via a flag in a small `system_events` row or in-memory).
- Audit log entry `SPAM_BURST_DETECTED` with the count.
- Email goes to all `ROLE_ADMIN` accounts.

**Acceptance:** Posting "I love kittens" → CLEAN, visible. Posting an obvious slur (matched by regex) → FLAGGED instantly, hidden from feed, author sees a "held for review" notification. Posting borderline content where OpenAI returns hate=0.6 (below the 0.5 threshold) → FLAGGED. With `MODERATION_ENABLED=false`, all posts immediately go to CLEAN.

---

## Phase 26 — Admin Panel (Full Feature)

Bigger than just a moderation queue — admins can manage users, gate
registration, kill sessions, and review reports + audit log. Frontend route
`/admin`, protected by `ROLE_ADMIN`. Backend endpoints under `/api/v1/admin/*`,
gated by `@PreAuthorize("hasRole('ADMIN')")`.

### [x] 26.1 System settings + role bootstrapping

- Migration `V<n>__system_settings.sql`:
  ```sql
  CREATE TABLE system_settings (
      key VARCHAR(64) PRIMARY KEY,
      value_text TEXT,
      value_bool BOOLEAN,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by_id BIGINT REFERENCES accounts(id) ON DELETE SET NULL
  );

  INSERT INTO system_settings (key, value_bool) VALUES
      ('registration_enabled', TRUE),
      ('verified_only_posting', FALSE),
      ('moderation_enabled', TRUE);
  ```
- `SystemSettingsService` — read/write with caching (Caffeine, 30s TTL).
- `SecurityConfig` plus `AuthManager.register(...)` consult `registration_enabled` — if `false`, reject with 403 + a message.
- A bootstrap admin: a one-shot Flyway `R__bootstrap_admin.sql` (repeatable) is wrong because we don't want to silently grant admin in prod. Instead, ship a dedicated `cli` command via a `CommandLineRunner` activated only when `--promote-admin=<username>` is passed. Document in README. Local dev: a seed user (Phase 27) is auto-promoted.

### [x] 26.2 Admin user management

Endpoints under `/api/v1/admin/users`:

- `GET /` — paginated list. Filter by `?status=active|banned|all`, `?verified=true|false`, `?role=user|admin`, `?q=<search>`. Returns `AdminAccountResponse` (extends PublicAccountResponse with email, last login, post count, ban status).
- `GET /{id}` — full detail incl. last 10 audit-log entries, last 10 login history rows, current session count.
- `POST /{id}/ban` — body `{ reason }`. Sets `accounts.banned_at` (new column — see migration below) and triggers `revokeAllForAccount(id)`. Audit `USER_BANNED`. Push WebSocket message `/user/{username}/queue/system` with a "your account has been suspended" payload (their next session refresh will fail and they'll be logged out anyway, this is just immediate UX).
- `POST /{id}/unban` — clears `banned_at`. Audit `USER_UNBANNED`.
- `POST /{id}/force-logout` — equivalent of `logout-all` for that user. Audit `FORCE_LOGOUT`.
- `POST /{id}/reset-password` — admin-initiated reset: generates a reset token (Phase 22) and emails it. Audit `ADMIN_INITIATED_RESET`.
- `POST /{id}/promote` — grants `ROLE_ADMIN`. Audit `ROLE_GRANTED`. Demote with `POST /{id}/demote`.

**Schema add:**
```sql
ALTER TABLE accounts
    ADD COLUMN banned_at TIMESTAMPTZ,
    ADD COLUMN banned_reason VARCHAR(500);
```

A banned user's posts are filtered out of public feeds (extend the visibility predicate). `JwtAuthenticationFilter` rejects requests from banned users with 403 (so even valid access tokens stop working immediately).

### [x] 26.3 Admin moderation queue + reports

- `GET /api/v1/admin/moderation-queue` — posts with `moderation_status='FLAGGED' AND admin_status='ACTIVE'`, ordered oldest-first. Paginated.
- `GET /api/v1/admin/reports?status=open|resolved` — paginated reports. Group by post — show `(postId, reportCount, latestReportedAt)` so admins triage by "most reported" first.
- `POST /api/v1/admin/posts/{id}/approve` — set `admin_status='RESTORED_BY_ADMIN'`, `moderation_status='CLEAN'`. Audit `POST_RESTORED_BY_ADMIN`. Push `POST_VISIBLE` on `/topic/feed`.
- `POST /api/v1/admin/posts/{id}/remove` — set `admin_status='REMOVED_BY_ADMIN'`. Audit `POST_REMOVED_BY_ADMIN`. Push `POST_REMOVED` on `/topic/feed`. Notify the author via `/user/{username}/queue/notifications`: "Your post was removed for violating community guidelines."
- `POST /api/v1/admin/reports/{id}/resolve` — body `{ resolution, removePost?: boolean, banUser?: boolean }`. One call covers the common workflows.

### [x] 26.4 Admin system controls

- `GET /api/v1/admin/settings` — current `system_settings` snapshot.
- `PUT /api/v1/admin/settings/{key}` — update one setting. Audit `SETTING_CHANGED` with key + old/new value in metadata.
- `GET /api/v1/admin/metrics` — counts: users (total / active 24h / banned), posts (total / today / flagged / removed), open reports, refresh-token families (active), email outbox (pending / sent today / failed).
- `GET /api/v1/admin/audit-log?action=&actorId=&targetType=&targetId=&page=&size=` — full filtered audit log access.

### [x] 26.5 Frontend `/admin`

- New route `/admin`, gated by a `<RequireAdmin>` wrapper that 403s if `user.role !== 'ROLE_ADMIN'`.
- Sidebar with sections: Dashboard, Moderation Queue, Reports, Users, Audit Log, System.
- **Dashboard** — top-line counters (cards) sourced from `/admin/metrics`. Auto-refresh every 30s.
- **Moderation Queue** — list of FLAGGED posts. Each row: post content + AI category scores (debug-style). Two buttons: Approve / Remove. Keyboard shortcuts (`A` / `R`).
- **Reports** — grouped by post. Click expands to show all reports for that post. Resolution dropdown.
- **Users** — paginated table with search + filters. Row click → user detail drawer. Drawer has all the actions from 26.2 behind buttons.
- **Audit Log** — filterable, infinite-scroll list. Read-only.
- **System** — toggles for `registration_enabled`, `verified_only_posting`, `moderation_enabled` (with a confirmation dialog for each, since these have user-visible blast radius).
- All admin actions show a confirmation `<Dialog>` when destructive (ban, remove, demote). Toasts on success.

**Acceptance:** A non-admin hitting `/admin` is redirected. An admin can: see the dashboard, find a flagged post, approve it (it's visible immediately on the feed via WebSocket), open a user detail, ban that user (their session dies within ≤ 15 min and any active WebSocket gets a system-channel message), toggle `registration_enabled` to false (next signup attempt returns 403). All actions appear in the audit log within 1 second.

---

## Phase 27 — Mock Data Seeder + AI Bot Service (Dead Internet Theory)

Two distinct things, sharing a phase because they both produce fake content:
- **Seeder** — a dev-only one-shot data generator using Java Faker. Boots the
  app with 50 realistic users, follows, posts, comments, likes. Never sends
  email, never invokes AI moderation.
- **Bot service** — a production-eligible scheduled poster that uses an LLM
  (Gemini Flash free tier) to generate believable posts on a cadence. Runs
  under a special `ROLE_BOT` so admins can spot bot-authored content if they
  want. Optional, gated by config.

### [ ] 27.1 Mock data seeder (dev only)

- Add `com.github.javafaker:javafaker:1.0.2` (test scope OR `runtime` scope — but DON'T put on the prod classpath).
- `db/seed/V<n>__seed_dev_data.sql` is one option. Better: a Java seeder class `dev.MockDataSeeder` that runs once at boot when:
  1. `spring.profiles.active` includes `local` AND
  2. `accounts` table count is `0`.
- Generates: 50 accounts (one is auto-promoted to `ROLE_ADMIN` — hardcoded username `admin_dev`, password `admin_dev_password`), 200 posts (varied lengths, some with images via known-good Cloudinary placeholder URLs), 30 reposts, 50 quote-reposts, 1000 likes spread across the 200 posts, 100 follow relationships, 80 reply chains.
- All seeded posts get `moderation_status='CLEAN'` directly (skip the AI call — we don't want to burn the OpenAI quota on Faker's lorem ipsum).
- Seeded accounts have `email_verified=true` so the verified-badge UI has data.
- Seeder is idempotent — only runs if accounts table is empty.
- Welcome emails are NEVER sent for seeded users (`UserRegisteredEvent` is bypassed by hitting the repository directly, not `AuthManager.register`).

### [ ] 27.2 Bot service (production-optional)

- Add a new role `ROLE_BOT` in `roles` migration. (Doesn't affect existing rows — bots are created later.)
- Config:
  ```yaml
  app:
    bot:
      enabled: ${BOT_ENABLED:false}
      gemini-api-key: ${GEMINI_API_KEY:}
      gemini-model: ${GEMINI_MODEL:gemini-2.5-flash}
      cadence-min-minutes: ${BOT_CADENCE_MIN:20}      # min wait between posts
      cadence-max-minutes: ${BOT_CADENCE_MAX:120}
      daily-quota: ${BOT_DAILY_QUOTA:50}              # hard cap per bot
      account-count: ${BOT_ACCOUNT_COUNT:5}
  ```
- One-shot bootstrapper that creates `BOT_ACCOUNT_COUNT` accounts with `ROLE_BOT` if they don't exist. Their displayName/bio is varied (Faker again). Email is `bot-{i}@bots.local`, no email verification.
- `BotPostScheduler` `@Scheduled(fixedDelay = 60_000)`:
  1. Pick a random bot account whose last post was longer ago than its random cadence (between `cadenceMinMinutes` and `cadenceMaxMinutes`).
  2. Check daily quota (count its posts in last 24h, skip if `>= dailyQuota`).
  3. Build a prompt mixing recent feed snippets ("here are 3 recent posts; write one in a similar tone, max 280 chars, no hashtags more than 1, no @mentions") and call Gemini.
  4. Persist the post via the normal `PostManager.create(...)` path so the moderation pipeline still runs. This is intentional — bots are not exempt from moderation.
  5. Log `BOT_POSTED` audit entry.
- Replies / interactions: bots randomly like a small fraction of recent posts (1 in 20 ticks). Don't have them follow each other automatically — admins/users follow bots manually if they want them in their feed.
- Gemini free tier: 1500 req/day. With 5 bots and 50 posts/day each = 250 calls/day. Comfortable.
- Failure handling: Gemini 5xx / quota → skip this tick, no retry. We're decorative, not critical.
- A killswitch endpoint: `POST /api/v1/admin/bots/disable` flips `app.bot.enabled` at runtime via the `system_settings` table.

**Acceptance (dev):** First boot with `local` profile + empty DB → 50 users, 200 posts, working follow graph, admin login works.
**Acceptance (prod-optional):** With `BOT_ENABLED=true` and a Gemini key, a bot posts something coherent within an hour. The post passes through OpenAI moderation. Disabling the bots via admin panel stops new posts within one scheduler tick.

---

## Phase 28 — Pre-Deploy Hardening Pass

Final security/config sweep before flipping the deploy switch. Many items here
are echoes of earlier phases (5.6, 18.x); this phase is the gate that nothing
ships without the full list checked.

### [x] 28.1 Production secret audit

- Every `${VAR:default}` in any `application*.yml` reviewed: is the default safe? If `prod` profile loads it, the default must be either a fail-fast sentinel (Phase 5.6.10 pattern) or empty.
- Every `*Config`/`*Properties` class reviewed for hard-coded fallbacks.
- A rendered list of REQUIRED env vars for `prod` lives in `.env.example` (Phase 18.5). The list at minimum includes:
  - `JWT_SECRET` (≥ 32 bytes random)
  - `DATABASE_URL`, `DB_USERNAME`, `DB_PASSWORD`
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `EMAIL_ENABLED=true`
  - `OPENAI_API_KEY` (for moderation)
  - `GEMINI_API_KEY` (only if `BOT_ENABLED=true`)
  - `FRONTEND_ORIGIN` (the public URL of the deployed client)
  - `SPRING_PROFILES_ACTIVE=prod`
- Secrets are in Render's env editor, not in any committed file.

### [x] 28.2 Security headers

`SecurityConfig` adds:
```java
http.headers(h -> h
    .contentTypeOptions(c -> {})                          // X-Content-Type-Options: nosniff
    .frameOptions(f -> f.sameOrigin())                    // clickjacking
    .referrerPolicy(r -> r.policy(STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
    .permissionsPolicy(p -> p.policy("geolocation=(), microphone=(), camera=()"))
    .httpStrictTransportSecurity(h2 -> h2.includeSubDomains(true).maxAgeInSeconds(31536000))
    .contentSecurityPolicy(csp -> csp.policyDirectives(
        "default-src 'self'; img-src 'self' https://res.cloudinary.com data:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss: https:;"
    ))
);
```
The CSP `connect-src` allows the SockJS/STOMP upgrade. Loosen only with care.
Test on the deployed URL — browser dev tools console will scream if a real
asset is blocked.

### [x] 28.3 CORS final lockdown

- `FRONTEND_ORIGIN` is the only origin allowed in prod. No wildcards anywhere (also see 5.6.7).
- `setAllowedHeaders` restricted to: `Authorization`, `Content-Type`, `X-Requested-With`, `Accept`, `Idempotency-Key` (for 21.4).
- `setExposedHeaders` restricted to `X-Request-Id`, `Retry-After`.
- WebSocket: same. `setAllowedOrigins(FRONTEND_ORIGIN)`, no patterns.

### [x] 28.4 SQL safety + transaction review

- Audit every `@Query` for parameter binding (no string concat). MapStruct/JPA paths should be safe by construction.
- Audit `@Transactional` placement: must be on the **manager** layer for orchestrating writes; service can be `@Transactional(readOnly = true)` on read paths.
- `open-in-view: false` is already set — verify no LazyInitializationException slip through (covered by integration tests in Phase 9.4).

### [ ] 28.5 Rate-limit verification

- Run a 1-minute curl burst against each rate-limited endpoint, confirm 429 responses arrive at the configured threshold.
- Confirm the IP-vs-user-id resolution (Phase 5.6.6) works behind Render's proxy: hit twice from the same Render-routed IP under two different bearer tokens, both succeed.

### [x] 28.6 Logging hygiene

- No `System.out.println` anywhere — `grep -rn "System.out" api/src/main`.
- No `e.printStackTrace()` — fail loudly via the logger.
- No PII in logs: email addresses, phone, tokens never logged. Logback masking of `password=` patterns added if needed.
- Logback JSON logging works on Render (Render's log viewer expects line-per-event; the logstash encoder produces that).

### [x] 28.7 Frontend production build review

- `npm run build` succeeds with zero TypeScript errors.
- Production bundle does not include `vite/devtools` or `react-query/devtools` (gate behind `import.meta.env.DEV`).
- No `console.log` left in feature code — keep a deliberate few in `lib/ws.ts` debug output but only when `import.meta.env.DEV`.
- Source maps: shipped (helps debug live), but bundle size kept reasonable (< 500 KB initial JS gzipped — verify in `dist/` after build).

### [x] 28.8 Health + readiness

- `/actuator/health` exposes `liveness` and `readiness` groups.
- `readiness` includes a DB check (Spring Boot does this by default with the JDBC starter).
- Render's `healthCheckPath: /actuator/health` is sufficient. Confirm in `render.yaml`.

**Acceptance:** A pre-deploy checklist run produces no FAIL items. The app boots in `prod` profile with all secrets set, fails fast if any are missing, and serves the frontend correctly behind Render's edge.

---

## Phase 29 — k6 Load Testing + OWASP ZAP Audit (Manual)

Both produce reports that go in `docs/`. Neither runs in CI (per the user's
preference — these are deliberate manual checks before each major release,
not gating gates).

### [ ] 29.1 k6 load test

- `tests/load/feed.js` — primary scenario: 50 virtual users, ramp 30s, sustain 60s, ramp-down 10s. Each VU: log in once, then loop on `GET /api/v1/posts/feed` with realistic 2–8s think time.
- Thresholds:
  ```js
  thresholds: {
      http_req_duration: ['p(95)<500'],
      http_req_failed: ['rate<0.01'],
  }
  ```
- Secondary scenarios: `tests/load/post-and-like.js` (writes), `tests/load/dm-burst.js` (WebSocket — k6 has STOMP-over-WebSocket support, but a simple HTTP POST simulation is acceptable).
- Run target: a local docker-compose stack OR a deployed staging instance. Never the prod URL.
- Output artifact: `docs/load-test-<date>.html` (k6's HTML report).
- README in `tests/load/` documenting how to run and interpret.

### [ ] 29.2 OWASP ZAP baseline scan

- Run via Docker: `docker run -v $(pwd)/docs:/zap/wrk/:rw zaproxy/zap-stable zap-baseline.py -t http://host.docker.internal:8080 -r zap-baseline-<date>.html`.
- Authenticated scan (more revealing): write a small ZAP context file with login credentials for a seed account; then `zap-full-scan.py` (only against staging — never prod).
- Triage findings:
  - HIGH/CRIT → fix before deploy. (Most likely zero given Phase 28's hardening, but a CSP misconfig or a missing security header will pop up here.)
  - MEDIUM → log as known issues in `docs/security/known-issues.md` with mitigation rationale.
  - LOW/INFO → ignore unless related to a real attack vector.
- Output: HTML report committed to `docs/security/zap-<date>.html`.

### [ ] 29.3 Documentation in `docs/`

- `docs/load-test-<date>.html` (k6 output)
- `docs/security/zap-<date>.html` (ZAP output)
- `docs/security/known-issues.md` — triaged medium/low items with notes
- `docs/security/threat-model.md` — short doc covering: trust boundaries, asset inventory (auth tokens, user data, uploaded media), top 10 threats (token theft, IDOR, mass-assignment, XSS in posts, CSRF on state-changing endpoints — already mitigated by stateless JWT, etc.).

**Acceptance:** Both reports exist on `main`. The README's "Security" section links to them. Any HIGH from ZAP is fixed before the next deploy.

---

## Phase 30 — Launch

### [ ] 30.1 Root README.md
Sections:
- Hero: project name, screenshot/gif, live link
- Overview: what + why
- Stack: list with version pins
- Features: bullets with WebSocket-related ones highlighted
- Quick start (local): clone + docker compose + npm run dev
- Project structure
- Architecture: link to ARCHITECTURE.md
- Acknowledgements: link to the 2024 legacy version

### [ ] 30.2 ARCHITECTURE.md
- Mermaid diagram of: client ↔ api ↔ postgres + cloudinary, with WebSocket overlay
- Module boundaries explanation
- Why monorepo, why monolith
- Real-time data flow (post → event → broadcast → client)
- Moderation pipeline diagram (post → AsyncEvent → OpenAI → status flip → invalidator)
- Email outbox pattern diagram (enqueue → flusher → Resend)

### [ ] 30.3 Deploy to Render
- Create Render account
- Connect GitHub
- Apply `render.yaml`
- Set secrets: `JWT_SECRET`, Cloudinary trio, `RESEND_API_KEY`, `EMAIL_FROM`, `OPENAI_API_KEY`, `FRONTEND_ORIGIN`, `BOT_ENABLED` (false initially), and (if enabling bots) `GEMINI_API_KEY`.
- Verify both services healthy
- Run the bootstrap admin promote step (Phase 26.1) to give yourself ROLE_ADMIN
- Test full happy path on live URLs: register → login → post → like → comment → DM → notification → admin panel access

### [ ] 30.4 Update legacy repo READMEs
Add to top of `social-media-api/README.md` and `social-media-frontend/README.md`:
> ⚠️ **Archived 2024 version.** This is preserved for reference. The 2026 modern rewrite — with WebSocket-based real-time feed, follow system, direct messaging, image uploads, AI content moderation, and a shadcn/ui frontend — lives at [`<new-repo-url>`](url).

Then archive both old repos via Settings → Archive on GitHub.

### [ ] 30.5 Portfolio integration
- Add link from main portfolio site
- Optional: case study page describing the rewrite (1 paragraph each: 2024 state → identified issues → 2026 redesign → result)

---

## Phase 31 — Internationalisation (i18n)

Two supported languages at launch: **English (`en`)** and **Turkish (`tr`)**.
English is the default. Language preference is persisted per-user in the DB
and falls back to browser language for unauthenticated pages.

Scope: all static UI strings (nav, buttons, form labels, toasts, empty states,
modals). User-generated content (posts, bios, DMs) is never translated.
Notification text is assembled on the frontend from typed enums — no backend
template changes needed.

### [ ] 31.1 Backend — clean up Turkish error messages

Several exception messages and one validation message are in Turkish. They reach
the HTTP response body via `GlobalExceptionHandler` which passes `ex.getMessage()`
directly. Fix in this order:

- Audit every `throw new ...Exception(...)` in `api/src/main/java/**` for
  Turkish strings. Convert to English. The messages are user-facing but not
  translated yet — English is the interim standard until 31.4 ships.
- Files confirmed to have Turkish messages (from security audit):
  `PostManager.java`, `PasswordResetService.java`, `AuthManager.java`,
  `CloudinaryStorageService.java`, `DmWebSocketController.java`.
- Turkish comments in code are also a CLAUDE.md violation — convert any found
  during this pass (same files + `AccountManager.java`).
- `GlobalExceptionHandler.handleIllegalArgument` and
  `handlePostingRestricted` must NOT echo `ex.getMessage()` directly to
  clients in prod; return a stable, translatable key or a generic English
  message. For validation errors use the `fieldErrors` map from
  `MethodArgumentNotValidException` — those messages are already in English
  (Bean Validation defaults).

**Acceptance:** `grep -rn "türkçe\|dosya\|yük\|geçersiz\|başarısız" api/src/main/java` returns nothing in exception messages.

### [ ] 31.2 Backend — `language_preference` on accounts

- Migration `V21__language_preference.sql`:
  ```sql
  ALTER TABLE accounts
      ADD COLUMN language_preference VARCHAR(5) NOT NULL DEFAULT 'en'
          CHECK (language_preference IN ('en', 'tr'));
  ```
- Update `Account` entity: `String languagePreference`.
- Expose in `MyAccountResponse` and `UpdateProfileRequest` (optional field,
  defaults to `'en'` if omitted). This allows the frontend to restore the
  user's saved language after login without relying on `localStorage` alone.

**Acceptance:** `PATCH /api/v1/accounts/me` with `{ "languagePreference": "tr" }` persists and is returned in `GET /api/v1/accounts/me`.

### [ ] 31.3 Frontend — i18n setup

- Install: `i18next`, `react-i18next`, `i18next-browser-languagedetector`,
  `i18next-http-backend`.
- `src/lib/i18n.ts` — configure with:
  - Backend plugin loading from `public/locales/{lng}/translation.json`.
  - Detector order: `querystring` → `localStorage` → `navigator` → `htmlTag`.
  - Default language: `en`. Fallback: `en`.
  - Namespace: `translation` (single namespace is sufficient at this scale).
- `src/main.tsx` — import `src/lib/i18n.ts` before rendering (side-effect
  import). Wrap app in `<Suspense>` during initial translation load (already
  present from Phase 28.7 lazy loading).
- `public/locales/en/translation.json` and `public/locales/tr/translation.json`
  — JSON trees keyed by feature (`auth.*`, `feed.*`, `profile.*`, `settings.*`,
  `admin.*`, `nav.*`, `common.*`, `notifications.*`, `errors.*`).

**Acceptance:** `i18n.changeLanguage('tr')` → all static UI strings switch without page reload.

### [ ] 31.4 Frontend — wrap all UI strings

Replace every hardcoded string in `client/src/` with `t('key')`. Work
feature-by-feature:

- `nav.*` — sidebar navigation labels, mobile tab bar.
- `auth.*` — login, register, forgot-password, reset-password, verify-email
  forms: labels, placeholders, button text, success/error messages.
- `feed.*` — FeedPage tabs ("For you" / "Following" / "Explore"), post
  composer placeholder, empty state.
- `post.*` — PostCard action labels (Like, Reply, Repost, Quote), timestamps
  via `date-fns` locale (pass `{ locale: tr }` when `lng === 'tr'`).
- `profile.*` — ProfilePage header (Follow/Unfollow, Edit Profile), bio
  empty state, tab labels (Posts / Replies / Reposts / Likes).
- `notifications.*` — notification type display text (assembled from actor
  username + type key, e.g. `t('notifications.liked', { actor: n.actor.username })`).
- `messaging.*` — conversation list, message composer placeholder, empty state.
- `settings.*` — all Settings section labels, button text, confirmation dialogs.
- `admin.*` — admin panel sidebar, table headers, action buttons, status badges.
- `common.*` — shared: "Cancel", "Save", "Confirm", "Loading…", "Error",
  "No results", pagination labels.
- `errors.*` — toast error messages, API error fallbacks.

**Rule:** never duplicate a string. If the same phrase appears in two places,
use the same key from `common.*`.

### [ ] 31.5 Frontend — language switcher

Two surfaces:

1. **Unauthenticated pages** (`/login`, `/register`): A small globe icon +
   dropdown (`EN` / `TR`) in the top-right corner of `AuthLayout`. Updates
   `i18next.changeLanguage(lng)` and persists to `localStorage`.

2. **Settings page** (`/settings`): A "Language" row in the Preferences section.
   Same dropdown, plus a `useMutation` call to `PATCH /api/v1/accounts/me` with
   `{ languagePreference: lng }` so the preference is server-persisted.

3. **On login**: After a successful auth, read `user.languagePreference` from
   the JWT/response and call `i18next.changeLanguage(user.languagePreference)`.
   This restores the server-saved preference on a new device or browser.

**Acceptance:** Switch to Turkish on desktop → refresh → still Turkish. Log in
on a different browser → language is restored from the server preference.

### [ ] 31.6 Frontend — date localisation

`date-fns` already supports Turkish. Pass the active locale to all `formatDistanceToNow`
and `format` calls:

```ts
import { tr, enUS } from 'date-fns/locale';
const locale = i18n.language === 'tr' ? tr : enUS;
formatDistanceToNow(date, { addSuffix: true, locale });
```

Centralise in a `src/lib/date.ts` helper `relativeTime(date: string | Date)` so
locale is always read from `i18next.language` — no prop-drilling.

**Acceptance:** Post timestamp shows "3 dakika önce" when language is `tr`, "3 minutes ago" when `en`.

---

## Cross-cutting Notes

- **Schema is set in stone after V1.** Once V1 lands on main, never edit it. Changes go through V2, V3, ...
- **DTOs must mirror exactly across stack.** When you add a field to `PostResponse` in Java, add it to `src/types/api.ts` in the same task.
- **Soft delete is universal except for `Follow`, `Notification`, `RefreshToken`, `LoginHistory`, `AuditLog`, `EmailOutbox`, `PasswordResetToken`, `EmailVerificationToken`, and `Report`.** A follow has a binary state (followed or not). A notification is read or unread, but deletion is hard (or just left alone — they accumulate, paginate them). A refresh token is either active or revoked — revoked rows must remain queryable for reuse detection (Phase 5.5.7). Audit log, login history, and email outbox are append-only by design. Verification and reset tokens have explicit `used_at` markers.
- **Self-actions don't generate notifications.** Liking your own post should not create a notification. Same for self-repost, self-quote, self-follow attempts (latter rejected at the controller anyway).
- **Backwards compatibility within a deploy.** Backend changes that affect the frontend contract land in the same commit — never deploy a backend that breaks the deployed frontend.
- **Tests aim for confidence, not coverage.** One happy-path integration test per major flow > 80% coverage of getters and setters.
- **Auth contract is the single hardest cross-cutting contract.** Any change to login/refresh/logout response shapes must update Phase 10.4 (interceptor), Phase 10.5 (store), and Phase 13.1 (STOMP client `connectHeaders`) in the same PR. The refresh-rotation contract from Phase 5.5.7 is non-negotiable: stored refresh token must be overwritten on every successful refresh.
- **Comments are posts.** As of V6 (Phase 5.6.1), there is no `Interaction.type=COMMENT`. A comment is a `Post` row with `parent_post_id != NULL`. Reply-fanout notifications go through `PostCreatedEvent`, not `InteractionCreatedEvent`. Anything in the docs or code that says otherwise is stale.
- **Repost vs reply vs quote-repost.** Three distinct shapes: a reply is a Post with `parent_post_id != NULL` and `quoted_post_id = NULL`; a quote-repost is a Post with `parent_post_id = NULL` and `quoted_post_id != NULL`; a simple repost is a row in the `reposts` table, not a Post at all. The frontend's `<PostCard>` must read all three correctly.
- **Email is rate-limited at the provider.** The free Resend tier is 100/day, 3000/month. The outbox + flusher (Phase 21) enforces these caps at 90/day and 2800/month — never bypass the outbox by calling Resend directly. Mock data seed never sends mail. Bot accounts never receive mail (Phase 27).
- **Moderation runs after persistence, not before.** A new post is persisted with `moderation_status='PENDING'` and is shown optimistically. The async moderator flips it to CLEAN or FLAGGED, and the broadcast updates clients in real time. Never block the request thread on the moderation API call.
- **Admin status outranks moderation status.** If `admin_status = 'RESTORED_BY_ADMIN'`, the post is visible regardless of `moderation_status`. If `admin_status = 'REMOVED_BY_ADMIN'`, the post is hidden regardless of moderation. The AI never overrides a human decision.
- **Bots are not exempt from moderation.** All bot posts go through the normal `PostManager.create(...)` path so the AI evaluates them like any other content. A bot whose posts repeatedly get FLAGGED is a bug, not a feature.
- **Audit log is one-way.** Admin actions, security events, and config changes all leave audit trails. The audit log is never edited or deleted from application code.
- **Layer order is unforgiving.** Controller → Manager → Service → Repository. The manager owns transactions, auth context resolution, and event publishing. Services do business logic and return entities. Mappers (DTO conversion) live at the manager boundary, never inside services. This rule is enforced by Phase 5.5.1 and audited again in Phase 28.4.
- **Production secrets fail fast.** Phase 5.6.10's startup validator extends to: `JWT_SECRET`, `CLOUDINARY_API_SECRET`, `RESEND_API_KEY`, `OPENAI_API_KEY`, and (only when bots are enabled) `GEMINI_API_KEY`. Missing any required secret in the `prod` profile aborts boot with a clear message.

---

## Pre-Deploy Security Audit — Findings From the Current Codebase

These items were surfaced by reviewing the current `api/` and `client/` source.
Each is wired into a specific phase task above; this section is the consolidated
reference list so nothing slips through before the deploy.

| # | Severity | Finding | Fix in |
|---|----------|---------|--------|
| 1 | **CRITICAL** | `JWT_SECRET` falls back to `dev-secret-must-be-at-least-32-bytes-long-please-change` if env var unset. Production tokens would be signed with a publicly-known key. | 5.6.10 |
| 2 | **CRITICAL** | `CorsConfigurationSource` falls back to `List.of("*")` when `app.cors.allowed-origins` is null, combined with `setAllowCredentials(true)`. Browser will technically reject `*`+credentials, but any misconfig that produces a single permissive origin still allows session theft. | 5.6.7 |
| 3 | **CRITICAL** | `WebSocketConfig.registerStompEndpoints` uses `setAllowedOriginPatterns("*")`. The `*` pattern bypasses the same-origin protection; a malicious site can open a STOMP session against the WebSocket if a victim is logged in. The commented-out `setAllowedOrigins(...)` line is the right code. | 5.6.7 |
| 4 | **HIGH** | `client/src/lib/api.ts` baseURL bug: `import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'`. Render's `VITE_API_URL` is the origin only; the `/api/v1` suffix is in the fallback only, so production HTTPS calls miss the path. | 5.6.8 |
| 5 | **HIGH** | `application-prod.yml` is essentially empty (two log-level lines). No CORS override, no Swagger gating, no error-detail suppression, no fail-loud sentinels. Production silently inherits dev values for everything not explicitly set. | 5.6.9 |
| 6 | **HIGH** | `/test.html` is `permitAll`'d in `SecurityConfig` and lives in `static/`. A WebSocket dev tester is publicly reachable in production. Move out of `static/`, drop the matcher. | 5.6.7 |
| 7 | **HIGH** | Swagger UI / OpenAPI JSON is `permitAll` in production. Even in a portfolio context this exposes the full API surface to scrapers. Disable in `prod` profile, or at minimum gate with basic auth. | 5.6.9 |
| 8 | **HIGH** | `forward-headers-strategy` is unset. Behind Render's proxy, every rate-limit bucket keys on the load balancer's IP — i.e. one shared bucket for all users. `X-Forwarded-For` parsing in `RateLimitAspect` works around this for HTTP, but actuator and any other Spring component using the request's remote address is wrong. | 5.6.9 |
| 9 | **HIGH** | Rate limiting is annotation-based and only on `/auth/register` + `/auth/login`. Posting, image upload, follow, and DM send are wide open to abuse. | 5.6.6 |
| 10 | **MEDIUM** | `InteractionType.COMMENT` enum still exists despite V6 removing the DB constraint and column. Any code path that still creates a row with `type=COMMENT` would fail at runtime. The compile-time API surface is wrong. | 5.6.1 |
| 11 | **MEDIUM** | No request body size cap for non-multipart endpoints. Spring won't reject a 100MB JSON body — it'll deserialize it (and run out of memory before the `@Size(max=500)` check can fire). | 5.6.11 |
| 12 | **MEDIUM** | No security headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, CSP, HSTS). Browsers default-permissively when these are absent. | 28.2 |
| 13 | **MEDIUM** | The frontend has no CSRF protection in shape but doesn't need it because of the bearer token model — provided no part of the API ever accepts session cookies. Verify that the deployed app never sets a cookie-based auth path during refresh-token rotation. | 28.4 |
| 14 | **MEDIUM** | `application-test.yml` has hardcoded JWT secret and Cloudinary credentials that look like real values to a quick reader. They aren't, but rename them to `test-only-not-a-real-secret-…` to reduce confusion in a public repo. | 28.6 |
| 15 | **LOW** | `RateLimitAspect` cache is `ConcurrentHashMap` with no eviction. Memory grows unbounded with unique IPs over time. Replace with Caffeine in Phase 20.1 or add an explicit max size. | 20.1 (extend) |
| 16 | **LOW** | `CorsConfiguration.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With", "Accept"))` is fine but Phase 21's outbox uses `Idempotency-Key` headers. Add it before email rolls out. | 28.3 |
| 17 | **LOW** | No `Content-Security-Policy` on the served frontend. Vite's dev server is permissive; Render's static hosting needs explicit CSP via `_headers` or response headers. | 28.2 |
| 18 | **INFO** | `LogstashEncoder` JSON logs include `MDC` automatically; if any future code stuffs PII into MDC (e.g. user emails for tracing), it'll show up in logs. Wire a Logback masking pattern early. | 28.6 |

**The five blockers** (must be fixed before flipping the deploy switch): #1, #2, #3, #4, #5.
Without these, the deploy will either be exploitable or non-functional in production.

---
