# Load testing (k6)

Performance tests run as Docker images against a **local** stack — never prod.
See `docs/RELEASE_ADIMLARI.md` Bölüm J for why prod is off-limits (Cloudflare
and the app's own rate limiters would be what you measured, and sustained
synthetic load risks Hetzner's abuse automation).

## Layout

```
tests/load/
├── lib/
│   ├── common.js     auth pool, per-endpoint metrics, response helpers
│   └── journeys.js   user journeys (lurker / engager / poster / searcher)
├── mixed.js          FLAGSHIP — concurrent realistic workload
├── capacity.js       admitted-throughput ceiling (open model)
├── soak.js           long-run stability / leak detection
├── realtime.js       concurrent STOMP WebSocket sessions
└── reports/          JSON summaries (gitignored)
```

## Run

```bash
# 1. Bring up the stack. --build matters: `up` alone reuses a cached image and
#    you will silently benchmark an old build.
docker compose build api
APP_BOT_ENABLED=false docker compose up -d

curl -fsS http://localhost:8080/actuator/health   # wait for {"status":"UP"}

# 2. The seeder only runs when the accounts table is EMPTY. If you have manual
#    test data, wipe first or the tests fall back to a near-empty feed:
#    docker compose down -v && APP_BOT_ENABLED=false docker compose up -d

# 3. Run a scenario. --no-deps stops compose from recreating the API mid-run.
docker compose --profile loadtest run --rm --no-deps --user "$(id -u):$(id -g)" \
  k6 run /scripts/mixed.js
```

Swap `mixed.js` for `capacity.js`, `soak.js` or `realtime.js`.
`soak.js` accepts `-e DURATION=2h`; `realtime.js` accepts `-e HOLD_SECONDS=120`.

## Scenarios

### `mixed.js` — realistic production-shaped workload

Four user types run **concurrently** at the ratio a social feed actually sees:
70% lurkers (read-only), 20% engagers (read + like + profile), 7% searchers,
3% posters. ~100 VUs, 4 minutes.

Testing one endpoint at a time never reproduces real contention — the
connection pool, the moderation executor and the caches are shared, and it is
the *mix* that saturates them. Each VU also runs a whole **session**
(feed → open a thread → read replies → visit the author), because a sequence is
what exposes N+1 queries; a single-endpoint loop cannot.

Thresholds are **per endpoint**, not aggregate: an aggregate p95 lets a slow
write path hide behind a large volume of fast reads, which is how load tests
end up green while the product feels broken.

### `capacity.js` — admitted throughput ceiling

Open model (`ramping-arrival-rate`): holds the offered rate regardless of server
speed. A closed model self-throttles — when the server slows, VUs wait, offered
load drops, and the server appears to "handle" a rate it never faced.

**This scenario respects the rate limiter rather than pretending it isn't
there.** `/posts/explore` is capped at 120 req/min per user, so the ceiling on
admitted traffic is `pool size × 2 req/s` ≈ 100 req/s with the 50-user seed
pool. Pushing past that measures Bucket4j, not Spring — so 429s are tracked as
a **separate signal** instead of being counted as server failures.

> To measure raw server capacity you would need a profile that disables the
> limiter. That is a deliberate decision and this script does not do it
> silently.

### `soak.js` — stability over time

40 VUs of steady realistic traffic for 30 minutes (override with `DURATION`).
Short bursts hide everything that accumulates: pool leaks, unbounded caches,
heap creep. Thresholds are *tighter* than `mixed.js` on purpose — this load is
well inside capacity, so a breach here means degradation over **time**.

Watch Netdata/Prometheus alongside it (`jvm_memory_used_bytes`,
`hikaricp_connections_pending`); the interesting failure is a slow upward drift
the k6 summary alone cannot show.

### `realtime.js` — concurrent WebSocket sessions

Opens STOMP sessions over `/ws-native` (raw WebSocket, as the mobile client
uses — `/ws` would measure SockJS negotiation instead), authenticates via the
`Authorization` header on the CONNECT frame, subscribes to
`/user/queue/notifications` and `/topic/feed`, then holds the session open.

HTTP throughput says nothing about how many **simultaneous** sessions the app
can hold: each pins a socket, a session-registry entry and broker subscriptions
for its lifetime, so the limiting resource is concurrency over time.

## Reading the results

| Signal | What it means |
|---|---|
| `journey_success` | Did complete user sessions finish? The headline number. |
| `lat_*` | Per-endpoint latency. Compare against the per-endpoint thresholds. |
| `admitted_requests` vs `throttled_429` | Server work vs the limiter doing its job. |
| `rate_limited_429` | Expected under sustained load — it is a feature, not a fault. |
| `auth_failures` | Should be 0. Anything else means the token pool broke and the run is invalid. |
| dropped iterations | k6 could not keep the offered rate — a capacity signal in itself. |

## Caveats when quoting numbers

- k6 and the API share one machine, so both compete for CPU. Real-world figures
  on dedicated hardware are typically better, not worse.
- Local Postgres is faster than a small managed instance.
- **Numbers are only valid for the build you tested.** Rebuild the image
  (`docker compose build api`) before a run you intend to quote — a cached
  image will happily benchmark month-old code.
