# Pre-Phase 3.4 Fix List

These are blocking bugs found during code review. All must be resolved
before implementing Phase 3.4 (Interaction entity). Execute tasks in
order — each one is self-contained and verifiable.

**Status legend**
- `[ ]` not started · `[~]` in progress · `[x]` done

---

## [x] Fix 1 — pom.xml: Spring Boot version + phantom test starters

**Severity:** 🔴 Blocker — project cannot build on this pom.xml.

**Problem 1:** `spring-boot-starter-parent` version is set to `4.0.6`.
Spring Boot 4 does not exist. Maven cannot resolve this. The correct
latest stable version is `3.4.5`.

**Problem 2:** The following test-scoped dependencies do not exist in
Maven Central. They are hallucinated artifact IDs and will cause build
failure:
- `spring-boot-starter-actuator-test`
- `spring-boot-starter-data-jpa-test`
- `spring-boot-starter-flyway-test`
- `spring-boot-starter-security-test`
- `spring-boot-starter-validation-test`
- `spring-boot-starter-webmvc-test`
- `spring-boot-starter-websocket-test`

**File:** `api/pom.xml`

### Steps

**Step 1.1** — Change the parent version:
```xml
<!-- BEFORE -->
<version>4.0.6</version>

<!-- AFTER -->
<version>3.4.5</version>
```

**Step 1.2** — Remove ALL of the phantom test starters listed above from
the `<dependencies>` block entirely.

**Step 1.3** — Add the real test dependencies in their place:
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-test</artifactId>
    <scope>test</scope>
</dependency>
```

> `org.testcontainers:postgresql` is already present and correct — leave it.

**Step 1.4** — Verify:
```bash
cd api && ./mvnw clean compile
```
Must exit with `BUILD SUCCESS`. No unresolvable dependency errors.

### Acceptance
- `./mvnw clean compile` exits `BUILD SUCCESS`
- `./mvnw dependency:tree` shows Spring Boot 3.4.5 at the root

---

## [x] Fix 2 — PostService: soft delete is doing a hard delete

**Severity:** 🔴 Blocker — the entire soft-delete architecture is bypassed.

**Problem:** `PostService.softDelete()` calls `postRepository.delete(post)`,
which issues a physical `DELETE` SQL statement. The `deletedAt` column is
never set. The `@SQLRestriction("deleted_at IS NULL")` on the `Post` entity
is therefore irrelevant for deletions — rows are gone, not hidden.

**File:** `api/src/main/java/com/ilhankazan/social/service/PostService.java`

### Steps

**Step 2.1** — Locate the `softDelete` method:
```java
@Transactional
public void softDelete(Long accountId, boolean isAdmin, Long postId) {
    Post post = getById(postId);
    if (!isAdmin && !post.getAccount().getId().equals(accountId)) {
        throw new AccessDeniedException("You can only delete your own posts");
    }
    postRepository.delete(post);   // ← THIS LINE IS WRONG
}
```

**Step 2.2** — Replace the last line:
```java
@Transactional
public void softDelete(Long accountId, boolean isAdmin, Long postId) {
    Post post = getById(postId);
    if (!isAdmin && !post.getAccount().getId().equals(accountId)) {
        throw new AccessDeniedException("You can only delete your own posts");
    }
    post.softDelete();           // sets deletedAt = Instant.now()
    postRepository.save(post);   // persists the change
}
```

`softDelete()` is already defined on `BaseEntity` — no new code needed there.

**Step 2.3** — Verify:
```bash
cd api && ./mvnw compile
```

### Acceptance
- `postRepository.delete(post)` no longer exists in `PostService`
- A deleted post is no longer returned by `findById` (because
  `@SQLRestriction` now has something to filter on)
- The `posts` table row remains but has `deleted_at` set to a non-null timestamp

---

## [x] Fix 3 — PostRepository / PostService: method name mismatch

**Severity:** 🔴 Blocker — `getProfileFeed` endpoint throws at runtime.

**Problem:** `PostRepository` declares:
```java
@Query("SELECT p FROM Post p WHERE p.account.id = :accountId AND p.parentPost IS NULL")
Page<Post> findByAccountId(@Param("accountId") Long accountId, Pageable pageable);
```

But `PostService.getProfileFeed()` calls:
```java
postRepository.findByAccountIdAndParentPostIsNull(accountId, pageable);
```

This method does not exist in the repository. Spring Data will throw
`NoSuchMethodError` / `UnsatisfiedDependencyException` at startup, or
`NullPointerException` at runtime depending on the Spring version.

**Files:**
- `api/src/main/java/com/ilhankazan/social/repository/PostRepository.java`
- `api/src/main/java/com/ilhankazan/social/service/PostService.java`

### Steps

Fix is in the **repository** — rename the method to match what the service
calls. The JPQL query already includes the `parentPost IS NULL` condition,
so just rename the Java method to match the derived name the service expects.

**Step 3.1** — In `PostRepository`, rename:
```java
// BEFORE
Page<Post> findByAccountId(@Param("accountId") Long accountId, Pageable pageable);

// AFTER
Page<Post> findByAccountIdAndParentPostIsNull(@Param("accountId") Long accountId, Pageable pageable);
```

The `@Query` annotation and its SQL content stay exactly the same.
Only the Java method name changes.

**Step 3.2** — Verify the service call is unchanged and now matches:
```java
// PostService.getProfileFeed() — already correct, no change needed
postRepository.findByAccountIdAndParentPostIsNull(accountId, pageable);
```

**Step 3.3** — Compile:
```bash
cd api && ./mvnw compile
```

### Acceptance
- `./mvnw compile` exits `BUILD SUCCESS`
- `GET /api/v1/posts/by-user/{username}` returns posts instead of throwing 500

---

## [x] Fix 4 — useAuthStore: accessToken must not be persisted

**Severity:** 🔴 Blocker (security) — short-lived access token written to
localStorage with no expiry enforcement.

**Problem:** The `persist` middleware has no `partialize` option, so the
entire store state — including `token` (the access token) — is written to
localStorage. Access tokens are short-lived (15 min) by design. Persisting
them to localStorage means:
- They survive browser restarts and remain readable long after expiry
- Any XSS vulnerability can read them from `localStorage`

Only `refreshToken` and `account` (user info) should be persisted.
The `token` (access token) should live in memory only — it will be
re-issued via the refresh token on page reload.

**File:** `client/src/store/useAuthStore.ts`

### Steps

**Step 4.1** — Add `partialize` to the persist config:

```ts
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      account: null,
      setAuth: (token, refreshToken, account) => set({ token, refreshToken, account }),
      logout: () => set({ token: null, refreshToken: null, account: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        account: state.account,
      }),
    }
  )
);
```

**Step 4.2** — Clear the existing localStorage entry so old persisted
access tokens are not left behind. This is a one-time dev step:
```js
// Run once in browser console on your local dev instance
localStorage.removeItem('auth-storage');
```

**Step 4.3** — Verify typecheck passes:
```bash
cd client && npm run typecheck
```

### Acceptance
- After login and page refresh, `token` in the store is `null` (re-auth via refresh needed)
- `refreshToken` and `account` survive page refresh
- `npm run typecheck` exits clean

---

## [x] Fix 5 — Frontend: create `src/types/api.ts` and remove `any`

**Severity:** 🟡 Major — type safety gap, violates project conventions.

**Problem:** Backend DTOs are not mirrored in a central types file.
`authService.ts` uses `data: any` for request parameters. Types are
scattered across `useAuthStore.ts` and `authService.ts` instead of
living in `src/types/api.ts`.

**Files to create/modify:**
- `client/src/types/api.ts` ← create
- `client/src/services/authService.ts` ← modify
- `client/src/store/useAuthStore.ts` ← modify (import from types)

### Steps

**Step 5.1** — Create `client/src/types/api.ts` mirroring backend records
exactly:

```ts
// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  identifier: string;  // username or email
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface AccountSummary {
  id: number;
  username: string;
  email: string;
  displayName: string;
  profileImageUrl: string | null;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  account: AccountSummary;
}

// ─── Account ─────────────────────────────────────────────────────────────────

export interface MyAccountResponse {
  id: number;
  username: string;
  email: string;
  phone: string | null;
  displayName: string;
  bio: string | null;
  profileImageUrl: string | null;
  coverImageUrl: string | null;
  role: string;
  createdAt: string;  // ISO-8601 Instant
}

export interface PublicAccountResponse {
  id: number;
  username: string;
  displayName: string;
  bio: string | null;
  profileImageUrl: string | null;
  coverImageUrl: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
}

// ─── Post ─────────────────────────────────────────────────────────────────────

export interface CreatePostRequest {
  content: string;
  imageUrl?: string;
  parentPostId?: number;
}

export interface UpdatePostRequest {
  content: string;
  imageUrl?: string;
}

export interface PostResponse {
  id: number;
  content: string;
  imageUrl: string | null;
  author: PublicAccountResponse;
  parentPostId: number | null;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  likedByMe: boolean;
  dislikedByMe: boolean;
  createdAt: string;  // ISO-8601 Instant
}

// ─── Common ───────────────────────────────────────────────────────────────────

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ErrorResponse {
  code: string;
  message: string;
  timestamp: string;
  path: string;
  fieldErrors: Record<string, string> | null;
}
```

**Step 5.2** — Update `useAuthStore.ts` to import from types instead of
declaring its own `AccountSummary`:

```ts
import { AccountSummary } from '@/types/api';

// Remove the local AccountSummary interface definition
// Everything else stays the same
```

**Step 5.3** — Update `authService.ts` to remove `any`:

```ts
import { api } from '@/lib/axios';
import { LoginRequest, RegisterRequest, AuthResponse } from '@/types/api';

export const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },
};
```

**Step 5.4** — Verify:
```bash
cd client && npm run typecheck && npm run lint
```

### Acceptance
- `npm run typecheck` exits clean, zero errors
- No `any` remains in `authService.ts` or `useAuthStore.ts`
- `src/types/api.ts` exists and is the single source of truth for DTO types

---

## [x] Fix 6 — PostRepository: protect `findReplies` from returning soft-deleted rows

**Severity:** 🟡 Major — deleted replies may appear in threads.

**Problem:** The `findReplies` JPQL query does not explicitly filter
`deletedAt IS NULL`. While `@SQLRestriction` applies to direct entity
loads, its behavior with JPQL queries that reference the entity through
a join condition (`p.parentPost.id`) is not guaranteed across all
Hibernate versions. Adding the explicit condition is low-cost insurance.

**File:** `api/src/main/java/com/ilhankazan/social/repository/PostRepository.java`

### Steps

**Step 6.1** — Update `findReplies`:
```java
// BEFORE
@Query("SELECT p FROM Post p WHERE p.parentPost.id = :parentPostId")
Page<Post> findReplies(@Param("parentPostId") Long parentPostId, Pageable pageable);

// AFTER
@Query("SELECT p FROM Post p WHERE p.parentPost.id = :parentPostId AND p.deletedAt IS NULL ORDER BY p.createdAt ASC")
Page<Post> findReplies(@Param("parentPostId") Long parentPostId, Pageable pageable);
```

`ORDER BY p.createdAt ASC` is added too — replies display oldest-first
(conversation order), unlike the feed which is newest-first.

**Step 6.2** — Compile:
```bash
cd api && ./mvnw compile
```

### Acceptance
- `./mvnw compile` exits `BUILD SUCCESS`
- A soft-deleted reply is not returned in the replies list

---

## Final Verification

After all fixes are applied, run the full check:

```bash
# Backend
cd api && ./mvnw clean compile
cd api && ./mvnw test

# Frontend
cd client && npm run typecheck
cd client && npm run lint
cd client && npm run build
```

All commands must exit cleanly before proceeding to **Phase 3.4**.

### Quick smoke test (manual, with running stack)
1. `docker compose up -d` → postgres up
2. `cd api && ./mvnw spring-boot:run` → app starts, Flyway runs V1
3. `POST /api/v1/auth/register` → 200 with tokens
4. `POST /api/v1/auth/login` → 200 with tokens
5. `POST /api/v1/posts` with bearer token → 201
6. `DELETE /api/v1/posts/{id}` → 204
7. `GET /api/v1/posts/{id}` on deleted post → 404 (not the deleted post)
8. `GET /api/v1/posts/by-user/{username}` → 200 with page (not 500)

Step 7 is the critical one — it proves soft delete is working.

---

---

## [x] Fix 7 — logback-spring.xml: No default root logger → zero log output

**Severity:** 🔴 Blocker (development) — app starts silently with no log output
when no Spring profile is active, making it look like the app crashed.

**Problem:** `logback-spring.xml` only defines root loggers inside
`<springProfile name="local">` and `<springProfile name="prod">` blocks.
If neither profile is active (the default when running from an IDE without
explicit VM options), **no appender is attached to the root logger**.
Spring Boot's own startup logs are also suppressed — banner appears but
nothing else, which looks like a hang or crash.

**File:** `api/src/main/resources/logback-spring.xml`

### Steps

**Step 7.1** — Replace the two `springProfile` blocks with a `!prod` / `prod`
split so that **any** non-production environment (including no profile) gets
plain-text output:

```xml
<!-- Non-prod: plain text (includes local, dev, test, and no-profile) -->
<springProfile name="!prod">
    <root level="INFO">
        <appender-ref ref="PLAIN_CONSOLE" />
    </root>
</springProfile>

<!-- Prod: structured JSON for log aggregators -->
<springProfile name="prod">
    <root level="INFO">
        <appender-ref ref="CONSOLE" />
    </root>
</springProfile>
```

The `PLAIN_CONSOLE` and `CONSOLE` appender definitions above stay unchanged.

**Step 7.2** — Verify by running the app without any `-Dspring.profiles.active`
flag. Spring Boot startup banner + INFO lines should appear in the console.

### Acceptance
- Spring startup logs are visible when no profile is set
- `prod` profile still uses `LogstashEncoder` (JSON output)

---

## [x] Fix 8 — Missing AccountManager: controller → service bypass

**Severity:** 🟡 Major — violates `controller → manager → service` layering
from CLAUDE.md; auth context (`SecurityContextHolder`) leaks into the service
layer where it does not belong.

**Problem:** `AccountController` injects `AccountService` directly. There is no
`AccountManager`. Meanwhile `PostController` correctly goes through `PostManager`.
Additionally, `AccountService` reads from `SecurityContextHolder` directly
(auth context belongs in the manager layer). Finally, `updateAvatar` and
`updateCover` declare `Object file` instead of `MultipartFile file`.

**Files to create/modify:**
- `api/.../manager/AccountManager.java` ← create
- `api/.../service/AccountService.java` ← refactor (remove auth context, fix types)
- `api/.../controller/AccountController.java` ← swap injection to AccountManager

### Steps

**Step 8.1** — Refactor `AccountService`: remove `SecurityContextHolder` calls
(those move to the manager), accept explicit `username` params, fix `Object` → `MultipartFile`:

```java
// getCurrentUser() → getByUsername(String username)
// updateProfile(request) → updateProfile(String username, request)
// deleteAccount()       → deleteAccount(String username)
// updateAvatar(Object)  → updateAvatar(String username, MultipartFile file)
// updateCover(Object)   → updateCover(String username, MultipartFile file)
```

**Step 8.2** — Create `AccountManager` that owns the auth context:

```java
@Service @RequiredArgsConstructor
public class AccountManager {
    private final AccountService accountService;

    private String currentUsername() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    public MyAccountResponse getCurrentUser()                        { return accountService.getByUsername(currentUsername()); }
    public PublicAccountResponse getPublicProfile(String username)   { return accountService.getPublicProfile(username); }
    public PageResponse<PublicAccountResponse> searchAccounts(...)   { return accountService.searchAccounts(...); }
    public MyAccountResponse updateProfile(UpdateProfileRequest req) { return accountService.updateProfile(currentUsername(), req); }
    public void deleteAccount()                                      { accountService.deleteAccount(currentUsername()); }
    public String updateAvatar(MultipartFile file)                   { return accountService.updateAvatar(currentUsername(), file); }
    public String updateCover(MultipartFile file)                    { return accountService.updateCover(currentUsername(), file); }
}
```

**Step 8.3** — Update `AccountController` to inject `AccountManager` instead
of `AccountService`.

**Step 8.4** — Compile:
```bash
cd api && ./mvnw compile
```

### Acceptance
- `AccountController` has no reference to `AccountService`
- `AccountService` has no `SecurityContextHolder` reference
- `./mvnw compile` exits `BUILD SUCCESS`

---

## [x] Fix 9 — pom.xml: Remove unused bucket4j-core dependency

**Severity:** 🟢 Minor — dead dependency, no rate limiting is implemented.

**Problem:** `bucket4j-core` is declared in `pom.xml` but there is no
rate-limiting filter, interceptor, or `@Bean` anywhere in the codebase.
Dead dependencies bloat the classpath and cause confusion.

**File:** `api/pom.xml`

### Steps

**Step 9.1** — Remove the bucket4j block:
```xml
<!-- Remove this entire block -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j-core</artifactId>
    <version>8.10.1</version>
</dependency>
```

> Rate limiting will be re-added in the auth hardening phase when the
> actual `RateLimitFilter` is implemented.

**Step 9.2** — Compile:
```bash
cd api && ./mvnw compile
```

### Acceptance
- `./mvnw dependency:tree` does not list `bucket4j-core`
- `./mvnw compile` exits `BUILD SUCCESS`

---

## [x] Fix 10 — Hibernate schema validation rejects CITEXT columns

**Severity:** 🔴 Blocker — app cannot start; `SchemaManagementException` on boot.

**Problem:** `username` and `email` columns are `CITEXT` in PostgreSQL (case-insensitive
text extension). Hibernate sees `CITEXT` as `Types#OTHER` and schema validation
(`ddl-auto: validate`) rejects it expecting `varchar(255)`.

**Fix:** Custom dialect that teaches Hibernate to treat `citext` as `VARCHAR`:
- `config/PostgreSQLCitextDialect.java` — overrides `resolveSqlTypeDescriptor`
- `application.yml` — `spring.jpa.database-platform` points to the custom dialect

---

## After These Fixes → Phase 3.4

Once all 6 fixes are done and final verification passes, proceed to
**PLAN.md Phase 3.4** (Interaction entity: like / dislike / comment).

The key work in 3.4:
- `Interaction` entity + `InteractionRepository`
- Toggle logic (like → unlike when called again, like → dislike when switched)
- `InteractionService` + `InteractionManager`
- Endpoints under `/api/v1/posts/{postId}/interactions/`
- Replace the `0L` constants in `PostMapper` with real counts from a
  batch query — NOT N+1 individual queries per post
- `likedByMe` / `dislikedByMe` resolved from the authenticated user's
  interaction rows
