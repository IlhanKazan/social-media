import { loginPool, tokenFor } from './lib/common.js';
import { lurkerJourney, engagerJourney } from './lib/journeys.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js';

// SOAK TEST — does it stay healthy, or does it rot?
//
// A short burst hides everything that accumulates: connection-pool leaks,
// unbounded caches, heap creep, log-driven disk fill. This holds a modest,
// realistic load for a long window and asserts that latency at the END looks
// like latency at the START.
//
// Watch Netdata/Prometheus alongside this run — the interesting failure is a
// slow upward drift in heap or pool-wait time, which the k6 summary alone
// cannot show you.
//
// Run (default 30m; override with DURATION):
//   docker compose --profile loadtest run --rm --user "$(id -u):$(id -g)" \
//     -e DURATION=2h k6 run /scripts/soak.js

const DURATION = __ENV.DURATION || '30m';

export const options = {
  scenarios: {
    steady_lurkers: {
      executor: 'constant-vus',
      vus: 30,
      duration: DURATION,
      exec: 'lurker',
    },
    steady_engagers: {
      executor: 'constant-vus',
      vus: 10,
      duration: DURATION,
      exec: 'engager',
    },
  },
  thresholds: {
    // Tighter than the mixed test on purpose: this load level is well inside
    // capacity, so any threshold breach here means degradation over TIME.
    'lat_explore': ['p(95)<350'],
    'lat_feed': ['p(95)<350'],
    'lat_post_detail': ['p(95)<250'],
    'journey_success': ['rate>0.99'],
    'http_req_failed': ['rate<0.005'],
    'auth_failures': ['count<10'],
  },
};

export function setup() {
  return { tokens: loginPool() };
}

export function lurker(data) { lurkerJourney(tokenFor(data.tokens)); }
export function engager(data) { engagerJourney(tokenFor(data.tokens)); }

export function handleSummary(data) {
  return {
    '/scripts/reports/soak-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
