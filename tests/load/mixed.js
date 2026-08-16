import { loginPool, tokenFor } from './lib/common.js';
import { lurkerJourney, engagerJourney, posterJourney, searchJourney } from './lib/journeys.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js';

// FLAGSHIP SCENARIO — a realistic production-shaped workload.
//
// Four user types run CONCURRENTLY at roughly the ratio a social feed actually
// sees. Testing them one at a time (as a single-endpoint script does) never
// reproduces the real contention: the connection pool, the moderation executor
// and the cache are all shared, and it is the mix that saturates them.
//
// Ratio (of ~100 concurrent users):
//   lurkers  70%  read-only, the bulk of real traffic
//   engagers 20%  read + like + profile visits
//   searchers 7%  search-heavy, different query shape
//   posters   3%  writes, async moderation, rate limits
//
// Run:
//   docker compose --profile loadtest run --rm --user "$(id -u):$(id -g)" \
//     k6 run /scripts/mixed.js

export const options = {
  scenarios: {
    lurkers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 70 },
        { duration: '3m', target: 70 },
        { duration: '30s', target: 0 },
      ],
      exec: 'lurker',
      gracefulRampDown: '20s',
    },
    engagers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '3m', target: 20 },
        { duration: '30s', target: 0 },
      ],
      exec: 'engager',
      gracefulRampDown: '20s',
    },
    searchers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 7 },
        { duration: '3m', target: 7 },
        { duration: '30s', target: 0 },
      ],
      exec: 'searcher',
      gracefulRampDown: '20s',
    },
    posters: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 3 },
        { duration: '3m', target: 3 },
        { duration: '30s', target: 0 },
      ],
      exec: 'poster',
      gracefulRampDown: '20s',
    },
  },

  // Per-endpoint gates. An aggregate p95 lets a slow write path hide behind a
  // large volume of fast reads, which is exactly how load tests end up green
  // while the product feels broken.
  thresholds: {
    'lat_explore': ['p(95)<400'],
    'lat_feed': ['p(95)<400'],
    'lat_post_detail': ['p(95)<300'],
    'lat_replies': ['p(95)<300'],
    'lat_profile': ['p(95)<400'],
    'lat_search': ['p(95)<600'],
    'lat_create_post': ['p(95)<1000'],
    'journey_success': ['rate>0.98'],
    // 429s from the per-user limiters (search 20/min, writes 30/5min) are
    // counted by k6 as failed requests. They are the app defending itself, so
    // the gate allows for them while still catching real 5xx/timeout failures.
    'http_req_failed': ['rate<0.05'],
    // 401/403 means the token pool broke — that invalidates the whole run,
    // so it is a hard gate rather than a soft signal.
    'auth_failures': ['count<10'],
  },
};

export function setup() {
  return { tokens: loginPool() };
}

export function lurker(data) { lurkerJourney(tokenFor(data.tokens)); }
export function engager(data) { engagerJourney(tokenFor(data.tokens)); }
export function searcher(data) { searchJourney(tokenFor(data.tokens)); }
export function poster(data) { posterJourney(tokenFor(data.tokens)); }

export function handleSummary(data) {
  return {
    '/scripts/reports/mixed-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
