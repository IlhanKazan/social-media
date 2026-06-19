# Load testing (k6)

Performance tests run as Docker images against a **local** stack — never prod.
Three scenarios, each writing its own HTML report.

## Run

```bash
# 1. Bring up the stack. APP_BOT_ENABLED=false lets MockDataSeeder populate
#    (~50 users, ~330 seed posts) instead of the bot provisioner pre-filling it.
APP_BOT_ENABLED=false docker compose up -d

curl -fsS http://localhost:8080/actuator/health   # wait for {"status":"UP"}

# 2. Run a scenario (k6 on the compose network, targets http://api:8080).
#    --user matches host uid so the HTML report is writable to the bind mount.
docker compose --profile loadtest run --rm --user "$(id -u):$(id -g)" k6 run /scripts/feed.js
docker compose --profile loadtest run --rm --user "$(id -u):$(id -g)" k6 run /scripts/stress.js
docker compose --profile loadtest run --rm --user "$(id -u):$(id -g)" k6 run /scripts/write.js

docker compose down -v
```

Reports are written to `tests/load/*-report.html`; the committed copies live at
`docs/load-*-2026-06-19.html`.

## Scenarios

### `feed.js` — read smoke test
50 VUs, ramp 30s / hold 60s / down 10s, `GET /posts/explore` with a 2–8s think
time. Thresholds (gate): `p95 < 500ms`, `failed < 1%`.

### `stress.js` — read capacity test
`ramping-arrival-rate` pushing 50 → 900 req/s (open model) at `GET /posts/explore`
to find the throughput knee. Only gate: `failed < 5%` (the job is to find the
limit, not hold an SLO).

### `write.js` — multi-user write test
`setup()` logs in a pool of 20 seed users, each with a distinct
`X-Forwarded-For` so the anonymous auth limiter (keyed on the first forwarded
hop) gives each its own bucket. 20 VUs then `POST /posts` across the pool. This
exercises the create path + async moderation under load **and** demonstrates the
per-user write limiter (30 / 5 min) returning 429 under sustained load.

### Why authenticate once / per-user pooling

Login is rate-limited (5/min/IP) and all VUs share one source IP. Read scenarios
log in once in `setup()`; the write scenario logs in N users with distinct
`X-Forwarded-For` values to obtain a token pool without tripping the limiter.

## Results (2026-06-19, local docker-compose, not Render)

These numbers reflect local hardware + local Postgres. **Render free tier (shared
CPU / 512 MB / managed PG) will be materially slower** — re-run against the
deployed instance for production-representative figures.

| Scenario | Throughput | Latency | Errors |
|----------|-----------|---------|--------|
| feed (smoke) | ~7.6 req/s (50 VUs + think time) | p95 ≈ 25 ms | 0% |
| stress (capacity) | ~490 req/s sustained; ~900 req/s target saturates (596 dropped iterations) | p95 9 ms → 513 ms as load climbs | 0% |
| write (multi-user) | 720 posts created in 60 s, then throttled | create p95 ≈ 68 ms | 720× 201, 1660× 429 (limiter, by design) |

**Read knee ≈ 500 req/s on local hardware** (0% errors up to it; p95 crosses
~400 ms and iterations start dropping past it). The write scenario's high "fail"
rate is the per-user rate limiter engaging — intended behavior, not server error.

## Reading the results

- **p95 latency** — 95% of requests faster than this.
- **http_req_failed** — fraction of non-2xx/timeout. In `write.js` this is
  dominated by intentional 429s; the `expected_response:true` latency line is the
  one to read for successful-create performance.
- **dropped_iterations** (stress) — the arrival-rate executor couldn't schedule
  iterations fast enough → the system is at capacity.
