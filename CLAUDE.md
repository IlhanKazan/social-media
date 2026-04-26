# Project Context

A monorepo containing a Twitter-like social media platform — a 2026 ground-up
rewrite of an earlier 2024 portfolio project. Goals: ship a production-grade,
real-time-featured app on Render with a modern stack, and serve as a
showcase piece linked from the user's portfolio.

The 2024 version lives in two separate (archived) repos and is preserved as
historical context. **This** project is a clean, modern rebuild — no
migration code, no bridging legacy patterns. New architecture, new schema,
new frontend, new everything.

## Repository Layout

```
.
├── api/                  # Spring Boot 3.4 monolith (Java 21)
├── client/               # React 19 + TypeScript SPA (Vite)
├── docker-compose.yml    # Local dev stack (postgres + api)
├── render.yaml           # Render.com IaC
├── PLAN.md               # Master plan (single source of truth)
├── CLAUDE.md             # This file
├── README.md             # Public-facing project intro
└── .claude/
    ├── agents/           # Specialized subagents
    └── commands/         # Custom slash commands
```

## Stack

**Backend (`api/`)**
- Java 21 (LTS), Spring Boot 3.4.x, Maven
- Spring Web, Spring Data JPA, Spring Security 6.4, Spring WebSocket (STOMP)
- PostgreSQL 16 + Flyway migrations
- jjwt 0.12.x (modern API — `verifyWith()`, `parseSignedClaims()`)
- MapStruct 1.6.x (records as DTOs, generated mappers)
- Lombok (entities only — DTOs are records)
- Cloudinary SDK for image upload
- Bucket4j for rate limiting on auth endpoints
- springdoc-openapi for Swagger UI
- Logback with logstash JSON encoder for structured logging

**Frontend (`client/`)**
- React 19, TypeScript (strict + `noUncheckedIndexedAccess`)
- Vite 6
- Tailwind CSS v4 + shadcn/ui (component-by-component install)
- TanStack Query v5 (server state)
- Zustand v5 with `persist` (auth state only)
- React Router v7
- React Hook Form + Zod (resolver) — NOT Formik+Yup
- Axios with interceptor pattern
- @stomp/stompjs + sockjs-client for WebSocket
- lucide-react (shadcn default icons)
- date-fns (relative timestamps)

**Infra**
- Docker (multi-stage builds, distroless runtime)
- Docker Compose for local dev
- Render.com for hosting (Web Service for api, Static Site for client, managed Postgres)
- GitHub Actions for CI

## Conventions

### Database
- **All identifiers `snake_case`.** Tables, columns, indexes, constraints.
- **Primary keys are `BIGSERIAL`** (becomes `Long` in Java). Never `int` or `INTEGER`.
- **Soft delete via `deleted_at TIMESTAMPTZ`** — `NULL` means active. Never a status int. Partial indexes: `WHERE deleted_at IS NULL`.
- **All timestamps are `TIMESTAMPTZ`** (timezone-aware). Never `TIMESTAMP` without zone. Default to `NOW()`.
- **`created_at` and `updated_at`** on every mutable table. `updated_at` auto-updated via trigger.
- **Foreign keys explicit about cascade behavior.** User-owned content: `ON DELETE CASCADE`. Reference data (roles): `ON DELETE RESTRICT`. Optional links (parent_post_id): `ON DELETE SET NULL`.
- **Username + email use `CITEXT`** for case-insensitive unique constraints.
- **Indexes for every hot-path query.** Profile feed, global feed, unread notifications, follow lookup all have explicit partial indexes.
- **Migrations are immutable.** Once `V1__init_schema.sql` lands on main, never edit it. New changes go in `V2__`, `V3__`, etc.

### Java
- Package root: `com.ilhankazan.social` (rename in pom.xml if you pick a different repo name).
- Layered: `controller → manager → service → repository`.
  - `controller`: thin REST handlers, validation, returns DTOs.
  - `manager`: orchestration boundary — auth context, transaction, event publishing.
  - `service`: pure business logic.
  - `repository`: JPA only.
- **DTOs are `records`.** Java 17+ feature, immutable, no Lombok needed.
  ```java
  public record CreatePostRequest(
      @NotBlank @Size(max = 500) String content,
      String imageUrl,
      Long parentPostId
  ) {}
  ```
- **Entities use Lombok** (`@Getter`, `@Setter`, `@NoArgsConstructor`, `@AllArgsConstructor`, `@Builder`). JPA needs no-arg + mutable.
- **All entities extend `BaseEntity`** which provides: `id`, `createdAt`, `updatedAt`, `deletedAt`, with `@CreatedDate` / `@LastModifiedDate` audit annotations.
- **Soft delete via `deletedAt`.** No `status` field. `@SQLRestriction("deleted_at IS NULL")` on entities where applicable.
- **`findById(...).orElseThrow(...)`** always. Never `getById()` (deprecated).
- **Constructor injection only.** No `@Autowired` fields. Lombok `@RequiredArgsConstructor` is fine if every field is `final`.
- **All endpoints under `/api/v1/...`**. Versioning baked in from day one.
- **Pagination wrapper**: every list endpoint returns `PageResponse<T>` (custom record), never raw Spring `Page<T>` (leaks pageable internals).
- **Exception handling centralized** in `GlobalExceptionHandler` (`@RestControllerAdvice`). Never let raw exceptions leak.

### TypeScript
- Strict mode + `noUncheckedIndexedAccess: true`.
- Path alias: `@/` for `src/`.
- File naming: components `PascalCase.tsx`, hooks `useThing.ts`, utilities `kebab-case.ts`, types `kebab-case.ts`.
- Backend DTOs mirrored exactly in `src/types/api.ts`. `Long` in Java → `number` in TS (until we exceed Number.MAX_SAFE_INTEGER, which we won't for IDs).
- React Query keys are arrays: `['posts', { page, size }]`, `['post', postId]`, `['conversations']`.
- Forms use `useForm` from RHF with `zodResolver(schema)`. Schemas live next to the form they're for, exported for reuse with the API call.
- Server state lives in TanStack Query. Client state in Zustand. Component state in `useState`. **Never overlap these layers.**

### Git
- Conventional Commits: `<type>(<scope>): <subject>`.
- Scopes: `api`, `client`, `infra`, `docs`.
- Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `ci`, `perf`, `style`.
- One commit = one logical change.
- **Never** include AI attribution, "Generated with..." footers, or `Co-Authored-By` lines for AI assistants.
- **No emojis** in commit messages, PR descriptions, or README files.
- Subject in imperative mood, lowercase, no trailing period, ≤72 chars.

### Code comments
- Default: **no comments.** Write self-documenting code with clear names.
- Add a comment only when the **WHY** is non-obvious: a hidden constraint, a workaround for a specific bug, a subtle invariant. Never explain WHAT the code does.
- No task references in code (`// added for issue #123`, `// used by AuthService`). Those belong in the commit message.
- No multi-line comment blocks. One short line max if a comment is needed at all.

## Build & Run

**Backend**
```bash
cd api
./mvnw clean package -DskipTests          # build
./mvnw spring-boot:run                    # run (postgres must be up)
./mvnw test                               # tests
./mvnw verify                             # full CI loop
```

**Frontend**
```bash
cd client
npm install
npm run dev                               # vite dev server (port 5173)
npm run build                             # production build → dist/
npm run typecheck                         # tsc --noEmit
npm run lint                              # eslint
npm run test                              # vitest
```

**Local full stack**
```bash
docker compose up -d                      # postgres + api
cd client && npm run dev                  # frontend separately
```

## Critical Rules for Code Generation

These rules exist because the user explicitly pushes back on speculative or
hallucinated code. Violations waste time.

1. **Never invent imports, methods, or library APIs.** Read the actual file
   before suggesting changes. For unfamiliar libraries, confirm the version
   in `pom.xml` / `package.json` first, then verify the API.
2. **Match the conventions above.** If existing entities use `Long id`, do
   not introduce `Integer accountId`. If existing DTOs are records, do not
   introduce a Lombok `@Data` class.
3. **Read PLAN.md before doing anything substantive.** Tasks have explicit
   acceptance criteria, file lists, and dependencies. Pick one task, do it,
   tick the box.
4. **One task at a time.** Sequencing exists for a reason. Phase 7 assumes
   Phase 6 is done.
5. **Test before committing.** Run `./mvnw test` (api) or
   `npm run typecheck && npm run lint` (client) before invoking the committer.
6. **Communicate findings, don't fabricate.** If a step is blocked because
   of a missing piece, say so and stop.

## Known Pitfalls (modern stack edition)

- **jjwt 0.12.x is NOT 0.9.x.** Modern API: `Jwts.parser().verifyWith(key).build().parseSignedClaims(token)`. Don't paste 0.9 examples from training data.
- **Tailwind v4 is NOT v3.** v4 uses CSS-first config (`@theme` directive in `app.css`), no `tailwind.config.js` by default. Plugins are imported in CSS.
- **shadcn/ui is NOT a package.** Components are CLI-installed and live in your repo (`src/components/ui/`). You own them, you can edit them, version bumps don't break them.
- **React Hook Form is NOT Formik.** No `<Formik>` wrapper, no `<Field>`. You use `useForm()` and spread `register('field')` onto inputs (or use `<Controller>` for non-native components like shadcn's Select).
- **Zod schema is the source of truth.** Define once, infer TS type with `z.infer<typeof schema>`, use for both client validation and (where needed) backend response parsing.
- **TanStack Query v5 dropped callbacks on `useQuery`.** No `onSuccess`/`onError` on queries. Use them on mutations only, or rely on `useEffect(() => {}, [data])` if you really need a side effect.
- **CITEXT requires the citext extension.** First V1 migration enables it.
- **Render Postgres free tier is small.** Indexes matter. Don't skip them.
- **WebSocket through Render works** but the connection upgrade requires the right Procfile-equivalent (we use Docker, so this is automatic). SockJS fallback is configured anyway.
- **Java 21 virtual threads** are enabled with one config line (`spring.threads.virtual.enabled=true`). Spring Boot 3.4 supports them natively for tomcat request handling.

## Workflow

The expected loop:

1. **planner** subagent reads PLAN.md, picks the next unblocked task, lays out
   concrete file-level work.
2. **backend-engineer** or **frontend-engineer** implements.
3. **debugger** runs the build/tests, fixes small failures.
4. **reviewer** reads the diff, flags issues.
5. **committer** stages and commits with a clean conventional message.
6. Repeat.

Invoke subagents via the Task tool or by name. Each agent has a focused tool
set — don't bypass them for tasks they own.
