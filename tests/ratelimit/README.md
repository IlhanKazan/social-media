# Rate-limit verification (Phase 28.5)

Rate limits are enforced per endpoint via the `@RateLimit(capacity, minutes)`
annotation, applied by `security/RateLimitAspect.java`. The bucket key is:

- **Authenticated requests:** `user:<username>` — so two users behind the same
  proxy IP get independent buckets.
- **Anonymous requests:** `ip:<client-ip>`, where the client IP is the **first**
  hop of `X-Forwarded-For` (falling back to `getRemoteAddr()` when the header is
  absent). Behind Render's edge, `forward-headers-strategy: native` (prod only)
  lets Tomcat resolve the real client IP, and the aspect's fallback uses it.

When a bucket is exhausted the API returns **HTTP 429** with body
`{"code":"TOO_MANY_REQUESTS","message":"Too many requests. Please try again later.", ...}`.

> Note: until the 28.5 verification, the catch-all `@ExceptionHandler(Exception.class)`
> in `GlobalExceptionHandler` swallowed the limiter's `ResponseStatusException`
> and returned **500** instead of 429. A dedicated `ResponseStatusException`
> handler now preserves the real status. Regression coverage lives in
> `api/src/test/.../integration/RateLimitIntegrationTest.java`.

## Automated check

`RateLimitIntegrationTest` runs in `mvn verify` and asserts:

1. The 6th `POST /api/v1/auth/login` within the window returns 429 (capacity 5).
2. Two different bearer tokens from one IP both succeed (user-id keying).
3. Two `X-Forwarded-For` values sharing only the first hop hit the same bucket
   (only the first hop is used as the key).

## Manual burst

`burst.sh` fires N requests at one endpoint and prints each status code. Run it
against a **local docker-compose stack or staging — never production.**

```bash
# 6 logins -> the 6th should print 429
./burst.sh -n 6 -f 203.0.113.9 http://localhost:8080/api/v1/auth/login

# authenticated create-post burst (capacity 30 / 5 min)
./burst.sh -n 35 -t "$TOKEN" -f 203.0.113.9 \
    -d '{"content":"load check","imageUrl":null,"parentPostId":null}' \
    http://localhost:8080/api/v1/posts
```

Use a distinct `-f` (X-Forwarded-For) value per run to start from a fresh
bucket; buckets are in-memory and keyed by IP/user + endpoint.

## Configured limits

| Endpoint | Method | Capacity | Window |
|---|---|---|---|
| `/api/v1/auth/register` | POST | 5 | 1 min |
| `/api/v1/auth/login` | POST | 5 | 1 min |
| `/api/v1/auth/password-reset/request` | POST | 3 | 60 min |
| `/api/v1/auth/password-reset/confirm` | POST | 5 | 60 min |
| `/api/v1/auth/verify-email` | POST | 5 | 60 min |
| `/api/v1/accounts/me/avatar` | POST | 10 | 60 min |
| `/api/v1/accounts/me/cover` | POST | 10 | 60 min |
| `/api/v1/accounts/me/email/send-verification` | POST | 3 | 60 min |
| `/api/v1/accounts/me/password` | PUT | 5 | 60 min |
| `/api/v1/posts` | POST | 30 | 5 min |
| `/api/v1/posts/upload-image` | POST | 10 | 60 min |
| `/api/v1/posts/{id}/repost` | POST | 30 | 5 min |
| `/api/v1/posts/{id}/quote-repost` | POST | 30 | 5 min |
| `/api/v1/posts/{postId}/report` | POST | 10 | 60 min |
| `/api/v1/conversations/{id}/messages/image` | POST | 20 | 5 min |
| `/api/v1/conversations/{id}/messages/share` | POST | 30 | 5 min |
| `/api/v1/follow/{accountId}` | POST | 60 | 5 min |
| `/api/v1/search`, `/search/users`, `/search/posts` | GET | 20 | 1 min |
| `/api/v1/admin/users/{id}/ban|unban|force-logout` | POST | 20 | 1 min |
| `/app/dm.send` (STOMP WebSocket) | SEND | 30 | 1 min |

Values are the source of truth in the controllers' `@RateLimit` annotations;
update this table if they change.
