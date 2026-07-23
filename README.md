# SocialHan

A real-time, Twitter-style social platform — feed, threaded replies, reposts,
follows, direct messages, live notifications, and search. Built as a
production-grade portfolio piece on a modern full-stack: Java 21 / Spring Boot
backend, React 19 / TypeScript frontend, PostgreSQL, and WebSocket-based live
updates throughout.

> This is a 2026 ground-up rewrite of an earlier 2024 portfolio project. The
> original is preserved at
> [social-media-api](https://github.com/IlhanKazan/social-media-api) and
> [social-media-frontend](https://github.com/IlhanKazan/social-media-frontend).
> SocialHan is a clean rebuild — new architecture, new schema, new frontend.

For a deeper technical tour, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Features

**Content and social graph**
- Microblog feed with posts, threaded replies, likes and dislikes
- Reposts and quote-reposts
- Follow system, with a following feed and a global explore feed
- Unified search across users and posts
- Public, unauthenticated browsing with a soft login wall — visitors can read,
  and are prompted to sign up only when they try to interact

**Real-time (WebSocket / STOMP)**
- Live feed and reaction updates without refresh
- 1:1 direct messages with read receipts, image attachments, and post sharing
- Push notifications with unread badges

**Media**
- Profile, cover, and post images via Cloudinary with strict multipart validation
- DM images stored as authenticated assets served through signed URLs

**Trust and safety**
- AI content moderation (OpenAI) behind a fast regex pre-filter
- Admin panel: moderation queue, reports, user management (ban / promote),
  system settings, an append-only audit log, and a maintenance console
- Optional AI bot accounts that post on a jittered cadence ("dead internet"
  demo mode) for a populated showcase

**Auth and accounts**
- JWT access tokens plus an HttpOnly refresh cookie, with refresh-token rotation
  and reuse detection, and a token blacklist
- BCrypt password hashing and Bucket4j rate limiting on sensitive endpoints
- Password reset and email verification (with a verified badge) over
  transactional email (Resend), sent through a capped outbox
- Asynchronous login-history tracking

**Compliance**
- About / Privacy / Terms pages (Turkish and English), a KVKK aydınlatma metni,
  a registration consent and age gate, and a working right-to-erasure path

**Operations (no-restart levers)**
- Read-only maintenance mode, admin-triggered cache invalidation and rate-limit
  reset, and Spring Boot Actuator diagnostics (metrics, loggers, caches) locked
  behind admin auth

## Stack

**Backend (`api/`)**
- Java 21 (LTS), Spring Boot 3.4, Maven
- Spring Web, Spring Data JPA, Spring Security 6, Spring WebSocket (STOMP)
- PostgreSQL 16 with Flyway migrations
- jjwt 0.12 (modern parser API), MapStruct (record DTOs), Lombok (entities only)
- Cloudinary, Bucket4j (rate limiting), Caffeine (in-process caches)
- springdoc-openapi (Swagger UI), Logback with logstash JSON encoder

**Frontend (`client/`)**
- React 19, TypeScript (strict, `noUncheckedIndexedAccess`), Vite
- Tailwind CSS v4, shadcn-style components on Base UI, lucide-react
- TanStack Query v5 (server state), Zustand (auth state), React Router v7
- React Hook Form + Zod, Axios, @stomp/stompjs + sockjs-client, date-fns

**Infrastructure**
- Docker (multi-stage build, non-root JRE runtime), Docker Compose for local dev
- GitHub Actions CI
- Hetzner VPS + Coolify (self-hosted PaaS), self-hosted PostgreSQL, Cloudflare (proxy/CDN/DDoS)

## Quick start (local)

Requires Docker and Node.js 20+.

```bash
git clone https://github.com/IlhanKazan/social-media.git
cd social-media
cp .env.example .env
# Fill in JWT_SECRET (any 32+ byte string for local) and the Cloudinary keys.
# Email and AI features are optional and stay disabled unless their keys are set.

# Backend + database
docker compose up -d

# Frontend (separate terminal)
cd client
npm install
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:8080
- Swagger UI (local profile only): http://localhost:8080/swagger-ui.html

Optional capabilities are toggled by environment variables, all off by default:
`RESEND_API_KEY` and `EMAIL_*` for email, `OPENAI_API_KEY` for moderation and the
bot service, and `PROMOTE_ADMIN_USERNAME` to grant an existing account admin on
the next boot (see [Administration](#administration)).

## Project structure

```text
.
├── api/                          # Spring Boot backend (Java 21)
│   ├── src/main/java/com/ilhankazan/social/
│   │   ├── config/               # Security, WebSocket, cache, OpenAPI config
│   │   ├── controller/           # REST + WebSocket handlers (incl. admin/)
│   │   ├── manager/              # Orchestration: auth context, transactions, events
│   │   ├── service/              # Business logic
│   │   ├── repository/           # Spring Data JPA
│   │   ├── entity/               # JPA entities (BaseEntity, soft delete)
│   │   ├── dto/                  # Request/response records
│   │   ├── security/             # JWT filter, rate limiting, read-only filter
│   │   ├── event/                # Domain events + async listeners
│   │   ├── task/ · scheduler/    # Scheduled cleanup and monitors
│   │   └── exception/            # GlobalExceptionHandler
│   └── src/main/resources/db/migration/   # Flyway (V1..V25)
├── client/                       # React frontend (Vite)
│   └── src/
│       ├── app/                  # Layouts, providers
│       ├── routes/               # Router config + guards
│       ├── features/             # Feature folders (auth, feed, messaging, admin, ...)
│       ├── components/ui/        # Base UI components
│       ├── stores/               # Zustand
│       └── types/                # Backend DTOs mirrored
├── docs/                         # Legal source texts, security notes
├── docker-compose.yml            # Local stack (postgres + api)
└── .github/workflows/ci.yml      # CI
```

Layering rule on the backend: `controller → manager → service → repository`.
DTOs are immutable records; entities use Lombok. See
[ARCHITECTURE.md](ARCHITECTURE.md) for the rationale and request lifecycle.

## Testing

```bash
cd api && JAVA_HOME=<jdk-21> ./mvnw verify   # backend, Testcontainers Postgres
cd client && npm run typecheck && npm run test
```

CI (`.github/workflows/ci.yml`) runs two jobs on every push and PR: the backend
`mvnw verify` (which gates on JaCoCo coverage), and the client typecheck, Vitest
suite, and production build. Lint runs in report-only mode.

## Deployment

The live deployment is self-hosted on a single Hetzner VPS, behind Cloudflare
(proxy mode: DNS, DDoS protection, CDN) and Coolify (self-hosted PaaS, Traefik
reverse proxy with automatic Let's Encrypt TLS, push-to-deploy from GitHub):

- **API** — multi-stage Docker image (`api/Dockerfile`), deployed by Coolify
- **Database** — PostgreSQL 16 in a container on the same VPS, internal-only
  (not exposed publicly); Flyway migrates on startup
- **Client** — multi-stage Docker image (`client/Dockerfile`): Vite build
  served by nginx, with immutable caching on hashed assets

Everything runs on one CX23 instance (2 vCPU, 4 GB RAM), so the JVM is tuned
accordingly (G1GC, `-Xmx768m`, bounded metaspace/code cache — see
`api/Dockerfile`). `/actuator/health` is the only public actuator endpoint;
everything else requires admin auth.

## Administration

The first admin is bootstrapped without code changes: register normally, then
set `PROMOTE_ADMIN_USERNAME=<username>` on the API and redeploy. A startup runner
promotes that account to `ROLE_ADMIN` on boot; remove the variable afterwards and
re-log in so the new role is reflected in a fresh token.

The admin panel exposes moderation, reports, user management, system settings,
the audit log, and a maintenance console (cache invalidation, rate-limit reset,
read-only mode).

## Acknowledgements

The 2024 version of this project mapped out where the rough edges were. Both
original repositories are kept for context:
[social-media-api](https://github.com/IlhanKazan/social-media-api) ·
[social-media-frontend](https://github.com/IlhanKazan/social-media-frontend).
