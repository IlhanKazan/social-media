import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js';

// Primary load scenario: the read-heavy global feed.
// Login is rate-limited (5/min/IP) and every VU shares one source IP, so we
// authenticate ONCE in setup() and share the token to all VUs. GET /posts/explore
// is not rate-limited, so VUs can hammer it freely with a human-like think time.

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // ramp up to 50 virtual users
    { duration: '60s', target: 50 }, // hold at 50
    { duration: '10s', target: 0 },  // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ identifier: 'ali_yilmaz', password: 'password123' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(res, { 'setup login is 200': (r) => r.status === 200 });
  const token = res.json('accessToken');
  if (!token) {
    throw new Error(`setup login failed (status ${res.status}): ${res.body}`);
  }
  return { token };
}

export default function (data) {
  const res = http.get(`${BASE_URL}/api/v1/posts/explore?page=0&size=20`, {
    headers: { Authorization: `Bearer ${data.token}` },
  });
  check(res, {
    'feed status is 200': (r) => r.status === 200,
    'feed returned a body': (r) => r.body && r.body.length > 0,
  });
  sleep(Math.random() * 6 + 2); // 2–8s think time
}

export function handleSummary(data) {
  return {
    '/scripts/load-report.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
