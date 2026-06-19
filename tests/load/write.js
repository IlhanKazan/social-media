import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js';

// Write-path load test. Post creation is rate-limited per user (30 / 5 min), so a
// single token saturates fast. We log in a POOL of seed users in setup() — each
// login carries a distinct X-Forwarded-For so the auth rate-limiter (keyed on the
// first forwarded hop for anonymous requests) gives each its own bucket — then VUs
// spread their writes across the pool. This exercises the create path + async
// moderation under concurrency AND demonstrates the per-user write limiter (429s)
// engaging under load.

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

const USERS = [
  'ali_yilmaz', 'zeynep_kaya', 'mehmet_demir', 'fatma_celik', 'can_aydin',
  'elif_sahin', 'emre_arslan', 'selin_korkmaz', 'burak_dogan', 'ayse_yildiz',
  'kemal_ozturk', 'merve_erdogan', 'oguz_sener', 'ipek_akyuz', 'baris_tekin',
  'ceren_ozkan', 'onur_karadag', 'nilan_ates', 'serkan_boz', 'gokce_alp',
];

export const options = {
  scenarios: {
    writes: {
      executor: 'constant-vus',
      vus: 20,
      duration: '60s',
    },
  },
  thresholds: {
    // Successful creates should stay responsive; 429s are expected and fine.
    'http_req_duration{expected_response:true}': ['p(95)<800'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  const tokens = [];
  for (let i = 0; i < USERS.length; i++) {
    const res = http.post(
      `${BASE_URL}/api/v1/auth/login`,
      JSON.stringify({ identifier: USERS[i], password: 'password123' }),
      { headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `10.0.${i}.1` } }
    );
    if (res.status === 200) tokens.push(res.json('accessToken'));
  }
  if (tokens.length === 0) throw new Error('no tokens obtained in setup');
  console.log(`setup: obtained ${tokens.length}/${USERS.length} tokens`);
  return { tokens };
}

export default function (data) {
  const token = data.tokens[(__VU - 1) % data.tokens.length];
  const res = http.post(
    `${BASE_URL}/api/v1/posts`,
    JSON.stringify({ content: `load post vu${__VU} iter${__ITER} ${Date.now()}`, imageUrl: null, parentPostId: null }),
    { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
  );
  // 201 = created, 429 = per-user write limiter kicked in. Both are correct behavior.
  check(res, { 'created or rate-limited': (r) => r.status === 201 || r.status === 429 });
  sleep(0.5);
}

export function handleSummary(data) {
  return {
    '/scripts/write-report.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
