import http from 'k6/http';
import { check } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js';

// Capacity test: push an increasing *arrival rate* (requests/sec, open model) at
// the feed read path until latency degrades / errors appear. Unlike feed.js
// (a fixed-VU smoke test with think time), this finds the throughput knee.

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export const options = {
  scenarios: {
    capacity: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 800,
      stages: [
        { target: 100, duration: '20s' },
        { target: 300, duration: '20s' },
        { target: 600, duration: '20s' },
        { target: 900, duration: '30s' },
        { target: 900, duration: '20s' },
      ],
    },
  },
  thresholds: {
    // This run's job is to FIND the limit, not gate on a fixed SLO. We only
    // assert the server doesn't fall over (keeps the error rate bounded).
    http_req_failed: ['rate<0.05'],
  },
};

export function setup() {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ identifier: 'ali_yilmaz', password: 'password123' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  const token = res.json('accessToken');
  if (!token) throw new Error(`setup login failed (${res.status}): ${res.body}`);
  return { token };
}

export default function (data) {
  const res = http.get(`${BASE_URL}/api/v1/posts/explore?page=0&size=20`, {
    headers: { Authorization: `Bearer ${data.token}` },
  });
  check(res, { 'status 200': (r) => r.status === 200 });
}

export function handleSummary(data) {
  return {
    '/scripts/stress-report.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
