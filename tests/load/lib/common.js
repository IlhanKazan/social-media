import http from 'k6/http';
import { check } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
export const API = `${BASE_URL}/api/v1`;

// MockDataSeeder provisions these with a shared password. Keep in sync with
// seeder/MockDataSeeder.java if the seed set changes.
//
// The pool size is load-bearing, not cosmetic: most read endpoints are rate
// limited per user (/posts/explore at 120/min = 2 req/s each), so the highest
// admitted request rate a test can generate is roughly `pool size x 2 req/s`.
// Testing with a handful of tokens measures the rate limiter instead of the
// server — which is the single most common way a load test produces a number
// that means nothing.
export const SEED_USERS = [
  'ali_yilmaz', 'zeynep_kaya', 'mehmet_demir', 'fatma_celik', 'can_aydin',
  'elif_sahin', 'emre_arslan', 'selin_korkmaz', 'burak_dogan', 'ayse_yildiz',
  'kemal_ozturk', 'merve_erdogan', 'oguz_sener', 'ipek_akyuz', 'baris_tekin',
  'ceren_ozkan', 'onur_karadag', 'nilan_ates', 'serkan_boz', 'gokce_alp',
  'james_walker', 'sarah_chen', 'michael_ross', 'emily_carter', 'david_kim',
  'jessica_lee', 'ryan_smith', 'amanda_jones', 'chris_brown', 'laura_davis',
  'alex_rodriguez', 'mia_wilson', 'noah_martinez', 'olivia_taylor', 'ethan_white',
  'chloe_harris', 'liam_johnson', 'sophia_thomas', 'mason_jackson', 'isabella_moore',
  'aiden_martin', 'ava_garcia', 'lucas_hernandez', 'mia_lopez', 'oliver_gonzalez',
  'emma_perez', 'william_sanchez', 'charlotte_ramirez', 'james_torres', 'amelia_flores',
];

/** Per-user cap on /posts/explore, from @RateLimit(capacity = 120, minutes = 1). */
export const EXPLORE_RPS_PER_USER = 2;
export const SEED_PASSWORD = 'password123';

// Per-endpoint latency, so a slow write path can't hide behind fast reads in an
// aggregate p95 — the aggregate is what makes most load-test numbers meaningless.
export const latency = {
  feed: new Trend('lat_feed', true),
  explore: new Trend('lat_explore', true),
  postDetail: new Trend('lat_post_detail', true),
  profile: new Trend('lat_profile', true),
  replies: new Trend('lat_replies', true),
  search: new Trend('lat_search', true),
  notifications: new Trend('lat_notifications', true),
  createPost: new Trend('lat_create_post', true),
  like: new Trend('lat_like', true),
};

export const business = {
  journeys: new Counter('journeys_completed'),
  postsCreated: new Counter('posts_created'),
  likes: new Counter('likes_toggled'),
  rateLimited: new Counter('rate_limited_429'),
  authFailures: new Counter('auth_failures'),
};

export const journeyOk = new Rate('journey_success');

/**
 * Log in a pool of seed users and return their access tokens.
 *
 * Login is rate-limited at 5/min per IP and every VU shares one source IP, so
 * each request carries a distinct X-Forwarded-For — the anonymous limiter keys
 * on the first forwarded hop, giving each login its own bucket. Without this
 * the pool silently collapses to a handful of tokens and the whole test ends up
 * measuring one user's rate limit instead of the server.
 */
export function loginPool(count) {
  const users = SEED_USERS.slice(0, count || SEED_USERS.length);
  const tokens = [];

  users.forEach((username, i) => {
    const res = http.post(
      `${API}/auth/login`,
      JSON.stringify({ identifier: username, password: SEED_PASSWORD }),
      {
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `10.${i}.0.1` },
        tags: { name: 'setup_login' },
      }
    );
    if (res.status === 200) {
      const token = res.json('accessToken');
      if (token) tokens.push(token);
    }
  });

  if (tokens.length === 0) {
    throw new Error(
      'setup: no tokens obtained. Is the stack up and seeded? ' +
      'Run with APP_BOT_ENABLED=false so MockDataSeeder populates.'
    );
  }
  if (tokens.length < users.length) {
    console.warn(`setup: only ${tokens.length}/${users.length} logins succeeded`);
  }
  return tokens;
}

export function authHeaders(token, name) {
  return {
    headers: { Authorization: `Bearer ${token}` },
    tags: name ? { name } : undefined,
  };
}

export function jsonHeaders(token, name) {
  return {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    tags: name ? { name } : undefined,
  };
}

/** Pick a token deterministically per VU so a user's rate-limit bucket is stable. */
export function tokenFor(tokens) {
  return tokens[(__VU - 1) % tokens.length];
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Human pause. Real users read; without this you measure a benchmark, not a workload. */
export function think(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Record a response against a per-endpoint trend and assert it.
 * Returns the parsed body on success, null otherwise.
 */
export function track(res, trend, label, expected) {
  trend.add(res.timings.duration);
  const okStatus = expected || [200];
  const ok = check(res, {
    [`${label} ok`]: (r) => okStatus.includes(r.status),
  });
  if (res.status === 429) business.rateLimited.add(1);
  if (res.status === 401 || res.status === 403) business.authFailures.add(1);
  if (!ok) return null;
  try {
    return res.json();
  } catch (e) {
    return null;
  }
}

/**
 * Unwrap one page item to the underlying post.
 *
 * The two list endpoints do NOT share a shape: /posts/explore returns bare
 * PostResponse objects, while /posts/feed wraps each one in a feed-item
 * envelope ({type, repostedAt, reposter, post}) so a repost can carry who
 * reposted it. Reading `item.author` works on one and silently yields
 * undefined on the other — which is how a journey ends up "passing" while
 * never exercising the step it claims to.
 */
function unwrapPost(item) {
  if (!item) return null;
  return item.post ? item.post : item;
}

/** Extract post ids from a PageResponse body, tolerating an empty feed. */
export function postIdsFrom(body) {
  if (!body || !Array.isArray(body.content)) return [];
  return body.content
    .map((item) => {
      const post = unwrapPost(item);
      return post ? post.id : null;
    })
    .filter((id) => id != null);
}

export function usernamesFrom(body) {
  if (!body || !Array.isArray(body.content)) return [];
  return body.content
    .map((item) => {
      const post = unwrapPost(item);
      return post && post.author ? post.author.username : null;
    })
    .filter((u) => u != null);
}
