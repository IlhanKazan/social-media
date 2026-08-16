import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import {
  API, SEED_USERS, EXPLORE_RPS_PER_USER,
  loginPool, tokenFor, authHeaders, latency,
} from './lib/common.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js';

// CAPACITY TEST — how much *admitted* traffic does the read path absorb, and
// where does the per-user rate limiter take over?
//
// Two things this deliberately does not do:
//
// 1. It does not use a closed model. `ramping-arrival-rate` holds the offered
//    rate no matter how slow the server gets. A fixed-VU test self-throttles:
//    when the server slows, VUs wait, offered load silently drops, and the
//    server appears to "handle" a rate it never actually faced.
//
// 2. It does not pretend the rate limiter isn't there. /posts/explore is capped
//    at 120 req/min per user, so the ceiling on admitted traffic is
//    `pool size x 2 req/s` — about 100 req/s with the full 50-user seed pool.
//    Pushing past that measures Bucket4j, not Spring. The ramp therefore tops
//    out near the admitted ceiling, and 429s are TRACKED as a separate signal
//    rather than being mistaken for server failure.
//
// Read the output as a curve: the knee is where p95 climbs while admitted
// throughput flattens. To measure raw server capacity with the limiter out of
// the picture you would need a load-test profile that disables it — a
// deliberate decision, not something this script does silently.

const admitted = new Counter('admitted_requests');
const throttled = new Counter('throttled_429');

// Headroom over the theoretical ceiling so the limiter's edge is visible.
const CEILING = SEED_USERS.length * EXPLORE_RPS_PER_USER;

export const options = {
  scenarios: {
    capacity: {
      executor: 'ramping-arrival-rate',
      startRate: 20,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 600,
      stages: [
        { target: Math.round(CEILING * 0.25), duration: '30s' },
        { target: Math.round(CEILING * 0.50), duration: '30s' },
        { target: Math.round(CEILING * 0.75), duration: '30s' },
        { target: Math.round(CEILING * 1.00), duration: '30s' },
        { target: Math.round(CEILING * 1.25), duration: '30s' },
        { target: Math.round(CEILING * 1.25), duration: '30s' },
      ],
    },
  },
  thresholds: {
    // Gate on the requests the server actually served. 429s are the limiter
    // doing its job and are reported separately.
    'lat_explore': ['p(95)<500'],
    'http_req_failed{expected_response:true}': ['rate<0.01'],
  },
};

export function setup() {
  const tokens = loginPool();
  console.log(
    `capacity: ${tokens.length} tokens -> admitted ceiling ~${tokens.length * EXPLORE_RPS_PER_USER} req/s`
  );
  return { tokens };
}

export default function (data) {
  const res = http.get(
    `${API}/posts/explore?page=0&size=20`,
    authHeaders(tokenFor(data.tokens), 'explore')
  );

  if (res.status === 200) {
    admitted.add(1);
    latency.explore.add(res.timings.duration);
  } else if (res.status === 429) {
    throttled.add(1);
  }

  check(res, { 'served or throttled': (r) => r.status === 200 || r.status === 429 });
}

export function handleSummary(data) {
  return {
    '/scripts/reports/capacity-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
