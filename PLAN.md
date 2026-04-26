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

## Phase 0 — Project Initialization

### [x] 0.1 Init monorepo
- `git init` at repo root
- Root `.gitignore`: `target/`, `node_modules/`, `dist/`, `build/`, `.idea/`, `.vscode/`, `.env`, `*.log`, `.DS_Store`, `out/`
- Root `.gitattributes`: `* text=auto eol=lf`
- Root `.editorconfig` for consistent indentation across editors
- Root `README.md` skeleton (filled in Phase 18)
- Place this kit's `CLAUDE.md`, `PLAN.md`, `.claude/` at repo root

**Acceptance:** `git status` clean, structure matches CLAUDE.md "Repository Layout".

### [x] 0.2 Init backend project
- Bootstrap from start.spring.io equivalent: Spring Boot 3.4.x, Java 21, Maven.
- Place under `api/`. Package root `com.ilhankazan.social` (rename if you change the repo name).
- Initial dependencies in `pom.xml`:
  - `spring-boot-starter-web`
  - `spring-boot-starter-data-jpa`
  - `spring-boot-starter-security`
  - `spring-boot-starter-validation`
  - `spring-boot-starter-actuator`
  - `spring-boot-starter-websocket`
  - `org.postgresql:postgresql` (runtime)
  - `org.flywaydb:flyway-core`
  - `org.flywaydb:flyway-database-postgresql`
  - `io.jsonwebtoken:jjwt-api:0.12.6`
  - `io.jsonwebtoken:jjwt-impl:0.12.6` (runtime)
  - `io.jsonwebtoken:jjwt-jackson:0.12.6` (runtime)
  - `org.mapstruct:mapstruct:1.6.2`
  - `org.mapstruct:mapstruct-processor:1.6.2`
  - `org.projectlombok:lombok` (provided)
  - `com.cloudinary:cloudinary-http44:1.39.0`
  - `com.bucket4j:bucket4j-core:8.10.1`
  - `org.springdoc:springdoc-openapi-starter-webmvc-ui:2.7.0`
  - `net.logstash.logback:logstash-logback-encoder:8.0` (runtime)
  - `org.springframework.boot:spring-boot-starter-test` (test)
  - `org.springframework.security:spring-security-test` (test)
  - `org.testcontainers:postgresql:1.20.4` (test)
- Maven properties: `<java.version>21</java.version>`, `<maven.compiler.release>21</maven.compiler.release>`
- Annotation processor paths configured for Lombok + MapStruct
- Verify: `cd api && ./mvnw -v` shows Java 21, `./mvnw clean compile` succeeds with empty `src/`

**Acceptance:** Empty Spring Boot app boots and exits cleanly with `./mvnw spring-boot:run` (will fail on missing DB — expected).

### [x] 0.3 Init frontend project
- `cd .. && npm create vite@latest client -- --template react-ts`
- `cd client`, configure:
  - Path alias `@/` → `src/` in `vite.config.ts` and `tsconfig.json`
  - `tsconfig.json` strict + `noUncheckedIndexedAccess: true`
  - ESLint + Prettier (use `eslint-plugin-react-hooks`, `@typescript-eslint`)
  - Add scripts: `typecheck`, `lint`, `format`, `test` (vitest)
- Install Tailwind v4: `npm install tailwindcss @tailwindcss/vite`
- Wire Tailwind via Vite plugin (no `tailwind.config.js` for v4 — CSS-first config in `src/index.css` using `@import "tailwindcss";` and `@theme {}` block)
- Install shadcn/ui CLI: `npx shadcn@latest init` — choose Tailwind v4, default style, no RSC, paths `@/components`, `@/lib/utils`
- Install runtime deps: `react-router-dom`, `@tanstack/react-query`, `zustand`, `axios`, `react-hook-form`, `zod`, `@hookform/resolvers`, `@stomp/stompjs`, `sockjs-client`, `lucide-react`, `date-fns`
- Install dev deps: `@types/sockjs-client`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`

**Acceptance:** `npm run dev` opens a working Vite page; `npm run typecheck` passes; shadcn folder structure exists.

### [x] 0.4 Configure root tooling
- Root `package.json` with workspace scripts (no actual workspaces — just convenience):
  ```json
  {
    "scripts": {
      "api:dev": "cd api && ./mvnw spring-boot:run",
      "client:dev": "cd client && npm run dev",
      "lint:client": "cd client && npm run lint"
    }
  }
  ```
- `.env.example` at root with all required env vars (filled as we add them)
- `docker-compose.yml` with postgres only for now (api added in Phase 17)

**Acceptance:** `docker compose up -d postgres` starts a working Postgres container.

---

## Phase 1 — Backend Foundation

### [x] 1.1 Application configuration

- `application.yml` (default, common config)
- `application-local.yml` (dev profile — verbose logs, dev DB)
- `application-prod.yml` (prod profile — INFO logs, env-only secrets)
- All secrets via `${ENV_VAR:default}` syntax
- Enable Java 21 virtual threads: `spring.threads.virtual.enabled: true`
- Enable Actuator endpoints: `health`, `info`, `metrics`

```yaml
spring:
  application:
    name: social-api
  datasource:
    url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/social}
    username: ${DB_USERNAME:postgres}
    password: ${DB_PASSWORD:postgres}
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
    properties:
      hibernate:
        jdbc:
          time_zone: UTC
  flyway:
    enabled: true
    locations: classpath:db/migration
  threads:
    virtual:
      enabled: true

server:
  port: ${SERVER_PORT:8080}

app:
  jwt:
    secret: ${JWT_SECRET:dev-secret-must-be-at-least-32-bytes-long-please-change}
    access-ttl-ms: ${JWT_ACCESS_TTL_MS:900000}        # 15 min
    refresh-ttl-ms: ${JWT_REFRESH_TTL_MS:2592000000}  # 30 days
  cors:
    allowed-origins:
      - http://localhost:5173
      - https://${RENDER_FRONTEND_HOST:localhost}
  cloudinary:
    cloud-name: ${CLOUDINARY_CLOUD_NAME:}
    api-key: ${CLOUDINARY_API_KEY:}
    api-secret: ${CLOUDINARY_API_SECRET:}
```

`@ConfigurationProperties` classes for `app.jwt`, `app.cors`, `app.cloudinary` (records).

**Acceptance:** App starts in `local` profile, hits `/actuator/health` returns `UP`.

### [x] 1.2 Flyway V1 — clean modern schema

Create `api/src/main/resources/db/migration/V1__init_schema.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS citext;

-- Auto-update trigger function (used by every mutable table)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ROLES
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO roles (name) VALUES ('ROLE_ADMIN'), ('ROLE_USER');

-- ACCOUNTS
CREATE TABLE accounts (
    id BIGSERIAL PRIMARY KEY,
    username CITEXT NOT NULL UNIQUE,
    email CITEXT NOT NULL UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password VARCHAR(255) NOT NULL,
    display_name VARCHAR(50),
    bio VARCHAR(160),
    profile_image_url VARCHAR(500),
    cover_image_url VARCHAR(500),
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_accounts_active ON accounts(id) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- POSTS
CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    content VARCHAR(500) NOT NULL,
    image_url VARCHAR(500),
    parent_post_id BIGINT REFERENCES posts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_posts_feed ON posts(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_by_account ON posts(account_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_replies ON posts(parent_post_id, created_at DESC)
    WHERE parent_post_id IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- INTERACTIONS (likes, dislikes, comments unified)
CREATE TABLE interactions (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('LIKE', 'DISLIKE', 'COMMENT')),
    content TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_comment_has_content CHECK (
        (type IN ('LIKE', 'DISLIKE') AND content IS NULL) OR
        (type = 'COMMENT' AND content IS NOT NULL AND length(content) > 0)
    )
);

CREATE UNIQUE INDEX uq_one_reaction_per_user_post
    ON interactions(account_id, post_id, type)
    WHERE type IN ('LIKE', 'DISLIKE') AND deleted_at IS NULL;

CREATE INDEX idx_interactions_post ON interactions(post_id, type)
    WHERE deleted_at IS NULL;

-- FOLLOWS
CREATE TABLE follows (
    id BIGSERIAL PRIMARY KEY,
    follower_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    following_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- NOTIFICATIONS
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    actor_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('LIKE', 'COMMENT', 'FOLLOW', 'REPLY', 'MENTION')),
    reference_id BIGINT,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_unread ON notifications(recipient_id, created_at DESC)
    WHERE read_at IS NULL;
CREATE INDEX idx_notifications_all ON notifications(recipient_id, created_at DESC);

-- CONVERSATIONS (canonical participant order: a < b)
CREATE TABLE conversations (
    id BIGSERIAL PRIMARY KEY,
    participant_a_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    participant_b_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(participant_a_id, participant_b_id),
    CHECK (participant_a_id < participant_b_id)
);

CREATE INDEX idx_conversations_participant_a ON conversations(participant_a_id, last_message_at DESC NULLS LAST);
CREATE INDEX idx_conversations_participant_b ON conversations(participant_b_id, last_message_at DESC NULLS LAST);

-- MESSAGES
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(content) > 0 AND length(content) <= 4000),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_thread ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_unread ON messages(conversation_id, sender_id) WHERE read_at IS NULL;
```

Optional: `V2__seed_dev_data.sql` for the local profile only — set `flyway.locations` per profile to include this only in `local`.

**Acceptance:** Clean DB → `./mvnw spring-boot:run` boots, `flyway_schema_history` shows V1 applied, all tables exist with expected indexes.

### [x] 1.3 BaseEntity + auditing setup

- `entity/BaseEntity.java` (abstract `@MappedSuperclass`):
  - `@Id @GeneratedValue(strategy = IDENTITY) Long id`
  - `@CreatedDate Instant createdAt`
  - `@LastModifiedDate Instant updatedAt`
  - `Instant deletedAt` (soft delete marker)
  - `isActive()` helper returning `deletedAt == null`
- Enable Spring Data JPA auditing: `@EnableJpaAuditing` on the application class.
- Annotate base with `@EntityListeners(AuditingEntityListener.class)`.

**Acceptance:** A test entity persisted via repository has `createdAt`/`updatedAt` populated automatically.

### [x] 1.4 Pagination wrapper

`dto/common/PageResponse.java` (record):
```java
public record PageResponse<T>(
    List<T> content,
    int page,
    int size,
    long totalElements,
    int totalPages,
    boolean last
) {
    public static <T> PageResponse<T> of(Page<T> page) {
        return new PageResponse<>(
            page.getContent(), page.getNumber(), page.getSize(),
            page.getTotalElements(), page.getTotalPages(), page.isLast()
        );
    }
}
```

Every list endpoint returns this — never raw `Page<T>`.

**Acceptance:** Unit test confirms mapping from a `PageImpl`.

### [x] 1.5 Global exception handler

`exception/GlobalExceptionHandler.java` annotated with `@RestControllerAdvice`. Handlers for:
- `EntityNotFoundException` → 404
- `MethodArgumentNotValidException` → 400 with structured field errors
- `ConstraintViolationException` → 400
- `AccessDeniedException` → 403
- `BadCredentialsException`, `AuthenticationException` → 401
- `DataIntegrityViolationException` → 409 (with sanitized message)
- `Exception` (catch-all) → 500

Standard error shape (`record ErrorResponse(...)`):
```java
public record ErrorResponse(
    String code,
    String message,
    Instant timestamp,
    String path,
    Map<String, String> fieldErrors  // null unless validation
) {}
```

**Acceptance:** Validation failures return structured 400; missing entity returns 404; no stack traces leak.

### [x] 1.6 Security configuration (jjwt 0.12.x)

- `security/JwtTokenProvider.java`:
  - Holds `SecretKey` derived via `Keys.hmacShaKeyFor(secret.getBytes(UTF_8))`
  - `generateAccessToken(String username, List<String> roles)` returns String
  - `generateRefreshToken(String username)` returns String
  - `validateToken(String token)` returns `Claims` or throws
  - Uses `Jwts.builder()`...`signWith(key, Jwts.SIG.HS256).compact()` for issuance
  - Uses `Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload()` for parsing

- `security/JwtAuthenticationFilter.java` extends `OncePerRequestFilter`:
  - Reads `Authorization: Bearer <token>` header
  - Validates, extracts username, loads `UserDetails`, sets `SecurityContext`
  - Skips public paths (auth endpoints, swagger, actuator/health)

- `config/SecurityConfig.java`:
  - `SecurityFilterChain` bean, stateless
  - CORS via custom `CorsConfigurationSource` reading from `app.cors.allowed-origins`
  - CSRF disabled (stateless JWT API)
  - Public paths: `POST /api/v1/auth/**`, `GET /v3/api-docs/**`, `GET /swagger-ui/**`, `GET /actuator/health`
  - All other paths require authentication
  - Method-level `@PreAuthorize` enabled via `@EnableMethodSecurity`
  - `BCryptPasswordEncoder` bean (strength 10)
  - JWT filter inserted before `UsernamePasswordAuthenticationFilter`

**Acceptance:** Login returns valid token; protected endpoints work with `Authorization: Bearer ...`; expired token returns 401.

### [x] 1.7 OpenAPI configuration

`config/OpenApiConfig.java`:
- Bean `OpenAPI` with title, version, description, contact
- Bearer auth security scheme registered
- Group definition for `/api/v1/**`

Tag every controller in later phases with `@Tag(name = "...")` and every method with `@Operation(...)`.

**Acceptance:** `/swagger-ui.html` renders, "Authorize" button works, calling a protected endpoint via Swagger after auth succeeds.

### [x] 1.8 Structured logging

`logback-spring.xml`:
- Console appender with JSON encoder (`logstash-logback-encoder`) when profile is `prod`
- Pretty pattern when profile is `local`
- MDC support for request ID (filter to populate)
- Custom `RequestIdFilter` adding a request ID to MDC + response header

**Acceptance:** Local logs are human-readable; prod logs are JSON with `request_id`, `level`, `logger`, `message`, `thread`.

---

## Phase 2 — Auth + Account Domain

### [x] 2.1 Role + Account entities

- `entity/Role.java` (immutable reference data, just `id`, `name`).
- `entity/Account.java` extends `BaseEntity`:
  - `username` (CITEXT, unique), `email` (CITEXT, unique), `phone` (nullable, unique), `password`, `displayName`, `bio`, `profileImageUrl`, `coverImageUrl`
  - `@ManyToOne(fetch = LAZY) @JoinColumn(name = "role_id") Role role`
  - `@SQLRestriction("deleted_at IS NULL")`
- `repository/AccountRepository`: `findByUsername`, `findByEmail`, `existsByUsername`, `existsByEmail`.
- `repository/RoleRepository`: `findByName`.

### [x] 2.2 Auth DTOs + service

DTOs (records under `dto/auth/`):
- `RegisterRequest(username, email, password, phone)` with validation
- `LoginRequest(usernameOrEmail, password)`
- `AuthResponse(accessToken, refreshToken, accountId, username, displayName)`
- `RefreshRequest(refreshToken)`

`service/AuthService`:
- `register(RegisterRequest)` — uniqueness checks, BCrypt hash, default role ROLE_USER, returns `AuthResponse`
- `login(LoginRequest)` — `AuthenticationManager` for credential check, returns `AuthResponse`
- `refresh(String refreshToken)` — validates refresh token, issues new access token

Manager layer (`manager/AuthManager`) wraps service for transaction + auth context.

### [x] 2.3 Auth controller

`controller/AuthController` at `/api/v1/auth`:
```
POST /register
POST /login
POST /refresh
POST /logout         # optional: blacklists refresh token via in-memory or DB blacklist
```

Apply Bucket4j rate limiting (Phase 9.1) to login + register later.

**Acceptance:** Register a new user → log in with returned credentials → use access token to call a protected endpoint (e.g., `GET /api/v1/accounts/me`).

### [x] 2.4 Account read endpoints

`controller/AccountController` at `/api/v1/accounts`:
```
GET /me                               # current user full profile
GET /{username}                       # public profile (no email/phone)
GET /search?q=&page=&size=            # username/displayName ILIKE search
```

DTOs:
- `MyAccountResponse` — full profile including email, phone, role
- `PublicAccountResponse` — username, displayName, bio, images, follower/following counts, isFollowing (when caller authenticated)

`AccountMapper` (MapStruct) handles entity → DTO.

### [x] 2.5 Account update + image upload

```
PATCH /api/v1/accounts/me              # partial update: displayName, bio
POST  /api/v1/accounts/me/avatar       # multipart, returns new profileImageUrl
POST  /api/v1/accounts/me/cover        # multipart, returns new coverImageUrl
DELETE /api/v1/accounts/me             # soft-delete current user
```

Cloudinary integration deferred to Phase 5 — for now stub to throw `UnsupportedOperationException` on the upload endpoints, complete them in 5.

**Acceptance:** PATCH updates the profile; GET reflects changes; soft-deleted account is no longer returned by lookups.

---

## Phase 3 — Posts + Interactions

### [x] 3.1 Post entity + repository

- `entity/Post.java` extends `BaseEntity`:
  - `@ManyToOne(LAZY) Account account`
  - `String content`, `String imageUrl`
  - `@ManyToOne(LAZY) Post parentPost` (nullable, self-FK)
  - `@SQLRestriction("deleted_at IS NULL")`
- `repository/PostRepository`:
  - `Page<Post> findByAccountId(Long accountId, Pageable)` — profile feed
  - Custom JPQL: `findFollowingFeed(Long userId, Pageable)` — posts from followed users + own
  - Custom JPQL: `findReplies(Long parentPostId, Pageable)`

### [x] 3.2 Post service + manager

- `service/PostService` — business logic
- `manager/PostManager` — orchestration with auth context + transactions + event publishing
- Methods: `create`, `update` (only own), `softDelete` (only own or admin), `getById`, `getProfileFeed`, `getFollowingFeed`, `getExploreFeed`, `getReplies`

### [x] 3.3 Post controller

`/api/v1/posts`:
```
POST   /                               # create
GET    /{id}                           # single (404 if soft-deleted)
PATCH  /{id}                           # update (own only)
DELETE /{id}                           # soft delete (own or admin)
GET    /feed?page=&size=               # follow-based feed for current user
GET    /explore?page=&size=            # global feed
GET    /by-user/{username}?page=&size= # profile feed
GET    /{id}/replies?page=&size=       # replies to a post
```

DTOs:
- `CreatePostRequest(content, imageUrl, parentPostId)`
- `UpdatePostRequest(content, imageUrl)`
- `PostResponse(id, content, imageUrl, author: PublicAccountResponse, parentPostId, likeCount, dislikeCount, commentCount, likedByMe, dislikedByMe, createdAt)`

Counts come from a single query that joins interactions (one batched query per page, not N+1).

**Acceptance:** Full CRUD round-trip; counts on response match what's in DB; cannot delete someone else's post.

### [x] 3.4 Interaction (like/dislike/comment)

- `entity/Interaction.java`: `account`, `post`, `type` (enum: LIKE, DISLIKE, COMMENT), `content` (only for COMMENT)
- Enum `InteractionType` matches DB CHECK constraint values exactly
- `repository/InteractionRepository`: `findByPostIdAndType`, `existsByAccountIdAndPostIdAndType`, `findCommentsByPostId(Pageable)`
- Service handles toggling: liking an already-liked post unlikes (soft-delete the row); switching from like to dislike soft-deletes the like and creates the dislike

Endpoints `/api/v1/posts/{postId}/interactions`:
```
POST   /like            # toggle like
POST   /dislike         # toggle dislike
POST   /comments        # create comment { content }
GET    /comments?page=&size=
DELETE /comments/{id}   # soft delete (own or admin)
```

DTOs:
- `CommentResponse(id, content, author, createdAt)`
- `InteractionResponse(liked, disliked, likeCount, dislikeCount)` — returned by toggle endpoints

**Acceptance:** Liking the same post twice is idempotent (still ends with one like); switching to dislike removes the like; comments paginate correctly.

---

## Phase 4 — Follow System

### [ ] 4.1 Follow entity + repository

- `entity/Follow.java`: `Account follower`, `Account following`, `createdAt` (no soft delete — unfollow is hard delete since the relation is just a boolean state)
- `repository/FollowRepository`:
  - `existsByFollowerIdAndFollowingId`
  - `deleteByFollowerIdAndFollowingId`
  - `Page<Account> findFollowingByFollowerId(Long, Pageable)` — joined query
  - `Page<Account> findFollowersByFollowingId(Long, Pageable)`
  - `countByFollowerId`, `countByFollowingId`

### [ ] 4.2 Follow service + manager

- Validates: cannot follow self, target must exist
- `follow(Long targetId)`, `unfollow(Long targetId)`, `getFollowers(Long, Pageable)`, `getFollowing(Long, Pageable)`, `isFollowing(Long currentUserId, Long targetId)`

### [ ] 4.3 Follow controller

`/api/v1/follow`:
```
POST   /{accountId}                            # follow
DELETE /{accountId}                            # unfollow
GET    /followers/{accountId}?page=&size=
GET    /following/{accountId}?page=&size=
GET    /is-following/{accountId}               # for current user
```

`PublicAccountResponse` already exposes `isFollowing` for the current user — that's the single-account version. List endpoints return that DTO too.

**Acceptance:** Follow → counts increment → appears in following list → posts from followed user appear in feed.

### [ ] 4.4 Follow-based feed JPQL

Add to `PostRepository`:
```java
@Query("""
    SELECT p FROM Post p
    WHERE (p.account.id = :userId
           OR p.account.id IN (
               SELECT f.following.id FROM Follow f WHERE f.follower.id = :userId
           ))
    ORDER BY p.createdAt DESC
""")
Page<Post> findFollowingFeed(@Param("userId") Long userId, Pageable pageable);
```

**Acceptance:** Following a user → next page refresh shows their newest post first.

---

## Phase 5 — Cloudinary Image Upload

### [ ] 5.1 Cloudinary integration

- `config/CloudinaryConfig.java` — bean wiring from `app.cloudinary.*`
- `service/ImageUploadService`:
  - `uploadProfileImage(MultipartFile, Long accountId)` → URL, folder `social/profile/`
  - `uploadCoverImage(MultipartFile, Long accountId)` → URL, folder `social/cover/`
  - `uploadPostImage(MultipartFile, Long accountId)` → URL, folder `social/posts/`
- Validation: ≤5MB, content-type starts with `image/`, allowed types: jpeg, png, webp, gif

### [ ] 5.2 Wire upload endpoints

Replace stubs in `2.5`:
- `POST /api/v1/accounts/me/avatar` → uploads, updates `profileImageUrl`, returns full account
- `POST /api/v1/accounts/me/cover` → same for cover
- `POST /api/v1/posts/upload-image` (separate from post creation) → returns `{ url }`. Client attaches URL to next `POST /posts` body.

**Acceptance:** Upload from Postman/cURL with auth token returns Cloudinary URL; profile reflects the new image.

---

## Phase 6 — WebSocket Foundation

### [ ] 6.1 WebSocket config

`config/WebSocketConfig.java`:
- `@EnableWebSocketMessageBroker`
- Endpoint `/ws` with SockJS fallback
- Simple in-memory broker on `/topic` (broadcast) and `/queue` (user-specific)
- App prefix `/app`
- User destination prefix `/user`
- Allow handshake from `app.cors.allowed-origins`

### [ ] 6.2 WebSocket JWT authentication

`security/WebSocketAuthInterceptor` implementing `ChannelInterceptor`:
- On `CONNECT` frame, read `Authorization` STOMP header
- Validate via existing `JwtTokenProvider`
- Set `Principal` on accessor (so `convertAndSendToUser(username, ...)` works)
- Reject with `ERROR` frame if invalid

Register the interceptor in `WebSocketConfig.configureClientInboundChannel`.

**Acceptance:** Connection without/invalid token rejected; valid token connects and can subscribe.

### [ ] 6.3 Domain event infrastructure

- `event/PostCreatedEvent`, `event/InteractionCreatedEvent`, `event/FollowCreatedEvent`, `event/MessageCreatedEvent`
- Publish via `ApplicationEventPublisher` from manager layer after persistence
- Listeners use `@TransactionalEventListener(phase = AFTER_COMMIT)` so rolled-back transactions don't trigger broadcasts

### [ ] 6.4 Post broadcast

`websocket/PostBroadcaster` listens to `PostCreatedEvent`:
- Sends `PostResponse` to `/topic/feed`

Frontend (Phase 13) filters: only display if from a followed account.

**Acceptance:** Two browser tabs subscribed to `/topic/feed`; one creates a post; both receive the message.

---

## Phase 7 — Notifications

### [ ] 7.1 Notification entity + repository

- `entity/Notification.java`: `recipient`, `actor`, `type` (enum), `referenceId`, `readAt`, `createdAt` (no soft delete)
- `repository/NotificationRepository`:
  - `Page<Notification> findByRecipientIdAndReadAtIsNull(Long, Pageable)` — unread
  - `Page<Notification> findByRecipientId(Long, Pageable)` — all
  - `int countByRecipientIdAndReadAtIsNull(Long)`
  - Bulk update: `@Modifying @Query` to set `readAt = NOW()` for all unread by recipient

### [ ] 7.2 Notification service + listeners

- `service/NotificationService`:
  - `create(recipientId, actorId, type, referenceId)` — skip if recipient == actor (no self-notify)
  - `findUnread(userId, Pageable)`, `findAll(...)`, `countUnread(userId)`
  - `markAllRead(userId)`, `markRead(notificationId, userId)` (auth check)

- `event/NotificationListener`:
  - `@TransactionalEventListener AFTER_COMMIT` on `InteractionCreatedEvent` (LIKE → notify post owner; COMMENT → notify post owner; nested COMMENT → also notify parent post owner)
  - Same pattern for `FollowCreatedEvent` → notify followed user
  - For each notification created, also push via WebSocket to `/user/{username}/queue/notifications`

### [ ] 7.3 Notification controller

`/api/v1/notifications`:
```
GET  /?page=&size=&unread=true|false
GET  /unread-count
PUT  /{id}/read
PUT  /read-all
```

**Acceptance:** Liking another user's post creates a notification → unread-count increments → WebSocket subscriber receives push → mark-as-read resets count.

---

## Phase 8 — Direct Messages

### [ ] 8.1 Conversation + Message entities

- `entity/Conversation.java`: `participantA`, `participantB` (canonical: a.id < b.id), `lastMessageAt`
- `entity/Message.java`: `Conversation conversation`, `Account sender`, `String content`, `Instant readAt`
- `repository/ConversationRepository`:
  - `findByParticipants(Long aId, Long bId)` — canonical-ordered lookup
  - `Page<Conversation> findByParticipantId(Long, Pageable)` — joined query, ordered by lastMessageAt DESC NULLS LAST
- `repository/MessageRepository`:
  - `Page<Message> findByConversationId(Long, Pageable)` — newest first
  - Bulk read receipt update

### [ ] 8.2 Service + manager

- `getOrCreateConversation(currentUserId, otherUserId)` — canonical ordering enforced before insert (smaller ID = participant_a)
- `sendMessage(conversationId, senderId, content)` — auth check + persist + bump `lastMessageAt` + publish event
- `listConversations(userId, Pageable)` — preview includes last message + unread count
- `listMessages(conversationId, userId, Pageable)` — auth check (user must be participant)
- `markRead(conversationId, userId)` — sets `readAt` on all messages from the OTHER participant

### [ ] 8.3 REST endpoints

`/api/v1/conversations`:
```
GET  /                                  # current user's conversations
POST /with/{accountId}                  # get-or-create
GET  /{id}/messages?page=&size=
PUT  /{id}/read                         # mark all unread (from other party) as read
```

### [ ] 8.4 WebSocket message handling

Client sends to `/app/dm.send` with `{ conversationId, content }`.

`@MessageMapping("/dm.send")` handler:
1. Auth check (sender must be participant — read from `Principal`).
2. Persist message.
3. Bump `lastMessageAt`.
4. Push to `/user/{otherParticipant}/queue/messages` AND `/user/{sender}/queue/messages` (sync sender's other tabs).

When recipient marks read, push `/user/{sender}/queue/read-receipts` with `{ conversationId, readAt }`.

**Acceptance:** Two browsers, two users → real-time chat → read receipts update without refresh.

---

## Phase 9 — Backend Polish

### [ ] 9.1 Rate limiting on auth endpoints
- Bucket4j: 5 login attempts per minute per IP. Same for register.
- Custom `@RateLimit` annotation + AOP aspect.

### [ ] 9.2 Search endpoints
- `GET /api/v1/search/users?q=&page=&size=` — username/displayName ILIKE
- `GET /api/v1/search/posts?q=&page=&size=` — content ILIKE
- Combined: `GET /api/v1/search?q=` returns top-N of each

### [ ] 9.3 OpenAPI annotations
- Every controller method gets `@Operation(summary, description)` + `@ApiResponse` for non-200 cases.
- Tag controllers (`@Tag(name = "Posts")`).

### [ ] 9.4 Integration tests
- `@SpringBootTest` with Testcontainers Postgres for happy-path tests on each major flow:
  - Auth: register → login → use token
  - Posts: create → fetch → like → comment → delete
  - Follow: follow → check feed includes target's posts
  - Notifications: trigger like → notification created
  - DM: get-or-create → send message → mark read

---

## Phase 10 — Frontend Foundation

### [ ] 10.1 Project structure
```
client/src/
├── app/                      # router + provider tree + layouts
│   ├── App.tsx
│   ├── Providers.tsx         # QueryClient, theme, router
│   └── layouts/
│       ├── AppLayout.tsx     # authenticated shell
│       └── AuthLayout.tsx    # public shell
├── routes/
│   ├── index.tsx             # router config
│   └── RequireAuth.tsx
├── features/
│   ├── auth/
│   ├── feed/
│   ├── post/
│   ├── profile/
│   ├── follow/
│   ├── notification/
│   ├── messaging/
│   └── search/
├── components/
│   ├── ui/                   # shadcn components
│   └── shared/               # cross-feature components
├── hooks/
├── lib/
│   ├── api.ts                # Axios instance
│   ├── ws.ts                 # STOMP client factory
│   ├── query-client.ts
│   └── utils.ts              # cn(), formatters
├── stores/
│   └── auth-store.ts         # Zustand
├── types/
│   ├── api.ts                # backend DTOs mirrored
│   └── domain.ts
├── styles/
│   └── globals.css           # Tailwind v4 + theme tokens
└── main.tsx
```

### [ ] 10.2 Tailwind v4 + shadcn theme

`src/styles/globals.css`:
```css
@import "tailwindcss";

@theme {
  --color-background: hsl(0 0% 100%);
  --color-foreground: hsl(240 10% 3.9%);
  --color-primary: hsl(240 5.9% 10%);
  /* ...full shadcn token set... */
}

@theme dark {
  --color-background: hsl(240 10% 3.9%);
  /* ...dark variants... */
}
```

Run `npx shadcn@latest init`. Choose:
- Style: `new-york` (cleaner) or `default`
- Base color: `zinc` or `slate`
- CSS variables: yes
- React Server Components: no (SPA)

### [ ] 10.3 Install initial shadcn components
```bash
npx shadcn@latest add button input label textarea avatar
npx shadcn@latest add card dialog dropdown-menu sheet
npx shadcn@latest add toast sonner skeleton scroll-area
npx shadcn@latest add tabs separator badge tooltip
npx shadcn@latest add form  # RHF integration
```

### [ ] 10.4 Axios instance + interceptors

`lib/api.ts`:
```ts
import axios from 'axios';
import { useAuthStore } from '@/stores/auth-store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + '/api/v1',
  timeout: 10000,
});

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
api.interceptors.response.use(
  r => r,
  async error => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshed = await useAuthStore.getState().tryRefresh();
      if (refreshed) {
        original.headers.Authorization = `Bearer ${useAuthStore.getState().accessToken}`;
        return api(original);
      }
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### [ ] 10.5 Auth store (Zustand)

`stores/auth-store.ts`:
- State: `accessToken`, `refreshToken`, `user`, `isAuthenticated`
- Actions: `login(response)`, `logout()`, `tryRefresh()`, `setUser(user)`
- `persist` middleware (localStorage) — but ONLY persists the refreshToken + user, not the accessToken (which is short-lived)

### [ ] 10.6 Query client + Providers

`lib/query-client.ts` — `QueryClient` with sane defaults (staleTime 30s, retry 1 on 4xx never, retry 3 on 5xx).

`app/Providers.tsx` wraps children with: `QueryClientProvider`, `ReactQueryDevtools`, `BrowserRouter` or `RouterProvider`, theme/dark-mode provider, `<Toaster />` from sonner.

### [ ] 10.7 Routing skeleton

`routes/index.tsx`:
- Public: `/login`, `/register`
- Authenticated (under `<RequireAuth>`):
  - `/` → Feed
  - `/explore` → Explore
  - `/u/:username` → Profile
  - `/notifications`
  - `/messages` and `/messages/:conversationId`
  - `/search`
  - `/settings`
- 404 catch-all

`<RequireAuth>` reads from `useAuthStore`. Redirects to `/login` with `from` state if not authenticated.

**Acceptance:** Empty pages render at all routes; protected routes redirect when not logged in.

---

## Phase 11 — Frontend Auth

### [ ] 11.1 Zod schemas + types

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

### [ ] 11.2 Login + Register pages

Use shadcn Form components (`Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`) wired with RHF `useForm({ resolver: zodResolver(schema) })`.

On submit: `useMutation` calls `/auth/login` or `/auth/register` → on success `useAuthStore.login(response)` + navigate to `/`.

Show server validation errors inline (response includes `fieldErrors` object from backend).

### [ ] 11.3 Auth integration test
Manual: register → log in → see `/` → refresh page → still logged in → click logout → back to `/login`.

---

## Phase 12 — Frontend Layout + Core Pages

### [ ] 12.1 AppLayout

- Sidebar (left): logo, nav items (Feed, Explore, Notifications, Messages, Profile, Settings, Logout), user mini-card at bottom
- Main content (center)
- Right rail (optional): trending / suggestions
- Mobile: sidebar collapses to bottom nav

### [ ] 12.2 Feed page

`features/feed/FeedPage.tsx`:
- Tabs: "Following" (default) / "Explore"
- Composer at top (CompactComposer expanding to full on focus)
- Infinite scroll via `useInfiniteQuery({ queryKey: ['feed', tab], queryFn: ... })`
- Each post = `<PostCard>`

### [ ] 12.3 PostCard

- Avatar, displayName, @username, relative time (date-fns `formatDistanceToNow`)
- Content + optional image
- Actions row: reply (count), like (count), dislike (count), share/copy-link
- Optimistic mutation on like/dislike with rollback
- Click anywhere on card → navigate to `/post/:id` (post detail with replies)

### [ ] 12.4 Profile page `/u/:username`

- Header: cover image, avatar overlapping cover bottom, displayName + @username, bio
- Stat row: Posts | Following | Followers
- Action: Follow/Unfollow button (or Edit Profile if own)
- Tabs: Posts | Replies | Likes
- Tab content: infinite list of relevant items

### [ ] 12.5 Edit profile dialog

shadcn `<Dialog>` with form (RHF + Zod):
- displayName, bio textarea
- Avatar upload (file input → POST `/accounts/me/avatar` → preview)
- Cover upload (same pattern)

**Acceptance:** Full happy path — register → log in → post → see in feed → visit profile → edit profile → upload images.

---

## Phase 13 — Frontend WebSocket

### [ ] 13.1 STOMP client

`lib/ws.ts`:
```ts
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export function createStompClient(token: string) {
  return new Client({
    webSocketFactory: () => new SockJS(`${import.meta.env.VITE_API_URL}/ws`),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 5000,
    debug: import.meta.env.DEV ? console.log : () => {},
  });
}
```

### [ ] 13.2 useWebSocket hook

Mounted ONCE at `AppLayout` level, not per page.
- Connects on mount with token from `useAuthStore`.
- Exposes via context: `subscribe(destination, handler)` returning unsubscribe fn.
- Reconnects on token refresh.

### [ ] 13.3 Real-time feed updates

In `FeedPage`:
- Subscribe to `/topic/feed` on mount.
- On message: if author is in following set or self → prepend to TanStack Query cache via `queryClient.setQueryData(['feed', 'following'], ...)`.
- Otherwise ignore (or buffer for explore tab).

Use `useEffect` cleanup to unsubscribe.

### [ ] 13.4 Real-time notifications

Globally subscribe to `/user/queue/notifications`:
- Increment unread count badge in sidebar.
- Show sonner toast with action linking to the related entity.

---

## Phase 14 — Frontend Notifications

### [ ] 14.1 NotificationDropdown
- Bell icon in header → shadcn `<DropdownMenu>` or `<Popover>`
- Unread count badge on bell
- Top N unread, scroll to load more
- Click item → mark read + navigate

### [ ] 14.2 NotificationsPage `/notifications`
- Full list, paginated
- Tabs: Unread / All
- "Mark all read" button

---

## Phase 15 — Frontend DM

### [ ] 15.1 ConversationsList `/messages`
- Two-pane layout (collapses to single-pane on mobile)
- Left: list of conversations with last message preview + unread badge
- Right: empty state ("Select a conversation") or selected thread

### [ ] 15.2 ConversationView `/messages/:conversationId`
- Header: other participant info
- Scrollable message list (reverse-paginated, oldest at top)
- Composer at bottom

### [ ] 15.3 Real-time message handling

- Subscribe to `/user/queue/messages` globally.
- On receive: if matches current open conversation → append + scroll to bottom + mark read; else → bump conversation in list + increment unread.
- Sending: optimistic append (status "sending") via STOMP `/app/dm.send` → on echo update status to "sent".

### [ ] 15.4 Read receipts UI
- Subscribe to `/user/queue/read-receipts`.
- "Seen at HH:MM" caption under last sent message.

---

## Phase 16 — Frontend Polish

### [ ] 16.1 Search page
- Single search bar in header → routes to `/search?q=...`
- Results: Users tab + Posts tab
- Empty / loading / error states

### [ ] 16.2 Skeletons + empty states
Every list page uses shadcn `<Skeleton>` while loading. Empty state with friendly message + CTA.

### [ ] 16.3 ErrorBoundary
Root-level `<ErrorBoundary>` catches render errors → shows recovery UI with reload button.

### [ ] 16.4 Dark mode
shadcn includes the `next-themes`-style toggle (or use a manual one with class on `<html>`). Persist to localStorage.

### [ ] 16.5 Mobile polish
- Sidebar → bottom nav on `< md`
- Composer modal-style on mobile
- All pages tested on 375px width

---

## Phase 17 — DevOps

### [ ] 17.1 docker-compose.yml
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

### [ ] 17.2 api/Dockerfile (multi-stage, optimized)
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

### [ ] 17.3 render.yaml
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

### [ ] 17.4 GitHub Actions CI
`.github/workflows/ci.yml`:
- Trigger: PR + push to main
- Job `api`: setup-java@v4 (temurin 21), cache `~/.m2`, `cd api && ./mvnw -B verify`
- Job `client`: setup-node@v4 (20), cache npm, `cd client && npm ci && npm run typecheck && npm run lint && npm run build`

### [ ] 17.5 .env.example finalized
List every required env var with description.

---

## Phase 18 — Launch

### [ ] 18.1 Root README.md
Sections:
- Hero: project name, screenshot/gif, live link
- Overview: what + why
- Stack: list with version pins
- Features: bullets with WebSocket-related ones highlighted
- Quick start (local): clone + docker compose + npm run dev
- Project structure
- Architecture: link to ARCHITECTURE.md
- Acknowledgements: link to the 2024 legacy version

### [ ] 18.2 ARCHITECTURE.md
- Mermaid diagram of: client ↔ api ↔ postgres + cloudinary, with WebSocket overlay
- Module boundaries explanation
- Why monorepo, why monolith
- Real-time data flow (post → event → broadcast → client)

### [ ] 18.3 Deploy to Render
- Create Render account
- Connect GitHub
- Apply `render.yaml`
- Set secrets (JWT_SECRET, Cloudinary trio)
- Verify both services healthy
- Test full happy path on live URLs

### [ ] 18.4 Update legacy repo READMEs
Add to top of `social-media-api/README.md` and `social-media-frontend/README.md`:
> ⚠️ **Archived 2024 version.** This is preserved for reference. The 2026 modern rewrite — with WebSocket-based real-time feed, follow system, direct messaging, image uploads, and a shadcn/ui frontend — lives at [`<new-repo-url>`](url).

Then archive both old repos via Settings → Archive on GitHub.

### [ ] 18.5 Portfolio integration
- Add link from main portfolio site
- Optional: case study page describing the rewrite (1 paragraph each: 2024 state → identified issues → 2026 redesign → result)

---

## Cross-cutting Notes

- **Schema is set in stone after V1.** Once V1 lands on main, never edit it. Changes go through V2, V3, ...
- **DTOs must mirror exactly across stack.** When you add a field to `PostResponse` in Java, add it to `src/types/api.ts` in the same task.
- **Soft delete is universal except for `Follow` and `Notification`.** A follow has a binary state (followed or not). A notification is read or unread, but deletion is hard (or just left alone — they accumulate, paginate them).
- **Self-actions don't generate notifications.** Liking your own post should not create a notification.
- **Backwards compatibility within a deploy.** Backend changes that affect the frontend contract land in the same commit — never deploy a backend that breaks the deployed frontend.
- **Tests aim for confidence, not coverage.** One happy-path integration test per major flow > 80% coverage of getters and setters.
