import http from 'k6/http';
import { sleep } from 'k6';
import {
  API, latency, business, journeyOk,
  authHeaders, jsonHeaders, pick, think, track, postIdsFrom, usernamesFrom,
} from './common.js';

// Each journey models one complete user session, not one request. Hammering a
// single endpoint measures that endpoint; a social feed is really a *sequence*
// — open the app, read, tap into something, look at who wrote it — and the
// sequence is what exposes N+1 queries and cache misses.

/**
 * Lurker: opens the app, scrolls the feed, reads one thread. No writes.
 * The overwhelming majority of real social traffic.
 */
export function lurkerJourney(token) {
  let ok = true;

  const feed = track(
    http.get(`${API}/posts/explore?page=0&size=20`, authHeaders(token, 'explore')),
    latency.explore, 'explore'
  );
  ok = ok && feed !== null;
  sleep(think(1.5, 4));

  const ids = postIdsFrom(feed);

  // Second page — pagination is where offset queries start to hurt.
  if (Math.random() < 0.5) {
    track(
      http.get(`${API}/posts/explore?page=1&size=20`, authHeaders(token, 'explore_p1')),
      latency.explore, 'explore page 1'
    );
    sleep(think(1.5, 4));
  }

  // Open a thread: detail + replies, the classic N+1 surface.
  if (ids.length > 0) {
    const id = pick(ids);
    const detail = track(
      http.get(`${API}/posts/${id}`, authHeaders(token, 'post_detail')),
      latency.postDetail, 'post detail'
    );
    ok = ok && detail !== null;
    sleep(think(2, 5));

    track(
      http.get(`${API}/posts/${id}/replies?page=0&size=20`, authHeaders(token, 'replies')),
      latency.replies, 'replies'
    );
    sleep(think(1, 3));
  }

  journeyOk.add(ok);
  business.journeys.add(1);
}

/**
 * Engager: everything the lurker does, plus profile visits, likes and a
 * notification check. Reads dominate; the writes are cheap toggles.
 */
export function engagerJourney(token) {
  let ok = true;

  const feed = track(
    http.get(`${API}/posts/feed?page=0&size=20`, authHeaders(token, 'feed')),
    latency.feed, 'feed'
  );
  ok = ok && feed !== null;
  sleep(think(1.5, 4));

  const ids = postIdsFrom(feed);
  const authors = usernamesFrom(feed);

  if (ids.length > 0) {
    const id = pick(ids);

    // Like toggle. 429 is correct behaviour under sustained load, not a failure.
    const like = http.post(
      `${API}/posts/${id}/interactions/like`, null,
      authHeaders(token, 'like')
    );
    latency.like.add(like.timings.duration);
    if (like.status === 200 || like.status === 201) business.likes.add(1);
    if (like.status === 429) business.rateLimited.add(1);
    sleep(think(0.5, 2));

    track(
      http.get(`${API}/posts/${id}`, authHeaders(token, 'post_detail')),
      latency.postDetail, 'post detail'
    );
    sleep(think(1, 3));
  }

  // Profile visit — a different query shape from the global feed.
  if (authors.length > 0) {
    const username = pick(authors);
    track(
      http.get(`${API}/accounts/${username}`, authHeaders(token, 'profile')),
      latency.profile, 'profile'
    );
    sleep(think(1, 3));

    track(
      http.get(`${API}/posts/by-user/${username}?page=0&size=20`, authHeaders(token, 'user_posts')),
      latency.profile, 'user posts'
    );
    sleep(think(1, 3));
  }

  track(
    http.get(`${API}/notifications/unread-count`, authHeaders(token, 'unread_count')),
    latency.notifications, 'unread count'
  );

  journeyOk.add(ok);
  business.journeys.add(1);
}

/**
 * Poster: reads, then writes. Post creation is rate-limited per user
 * (30 / 5 min) and triggers async moderation, so this is the expensive path.
 */
export function posterJourney(token) {
  let ok = true;

  const feed = track(
    http.get(`${API}/posts/explore?page=0&size=20`, authHeaders(token, 'explore')),
    latency.explore, 'explore'
  );
  ok = ok && feed !== null;
  sleep(think(2, 5));

  const res = http.post(
    `${API}/posts`,
    JSON.stringify({
      content: `Load test post from VU ${__VU}, iteration ${__ITER}. ${Date.now()}`,
      imageUrl: null,
      parentPostId: null,
    }),
    jsonHeaders(token, 'create_post')
  );
  latency.createPost.add(res.timings.duration);

  if (res.status === 201) business.postsCreated.add(1);
  else if (res.status === 429) business.rateLimited.add(1);
  else ok = false;

  sleep(think(1, 3));

  // Reply to something in the feed — exercises the threaded path.
  const ids = postIdsFrom(feed);
  if (ids.length > 0 && Math.random() < 0.4) {
    const reply = http.post(
      `${API}/posts`,
      JSON.stringify({
        content: `Reply from VU ${__VU} at ${Date.now()}`,
        imageUrl: null,
        parentPostId: pick(ids),
      }),
      jsonHeaders(token, 'create_reply')
    );
    latency.createPost.add(reply.timings.duration);
    if (reply.status === 201) business.postsCreated.add(1);
    if (reply.status === 429) business.rateLimited.add(1);
  }

  journeyOk.add(ok);
  business.journeys.add(1);
}

/**
 * Searcher: search is its own cost profile (ILIKE / index scans) and is worth
 * isolating rather than averaging into feed reads.
 */
export function searchJourney(token) {
  const terms = ['a', 'ali', 'gun', 'test', 'yeni', 'proje', 'kod'];
  const term = pick(terms);

  // Search is rate-limited to 20/min per user, so 429 is correct behaviour once
  // a VU searches faster than a human would — it is the limiter working, not a
  // fault. Counting it as an error would gate the run on our own protection.
  track(
    http.get(`${API}/search/posts?q=${term}&page=0&size=20`, authHeaders(token, 'search_posts')),
    latency.search, 'search posts', [200, 429]
  );
  sleep(think(3, 7));

  track(
    http.get(`${API}/search/users?q=${term}&page=0&size=20`, authHeaders(token, 'search_users')),
    latency.search, 'search users', [200, 429]
  );
  sleep(think(3, 7));

  business.journeys.add(1);
  journeyOk.add(true);
}
