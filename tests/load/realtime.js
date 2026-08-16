import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { BASE_URL, loginPool, tokenFor } from './lib/common.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js';

// REAL-TIME CONNECTION CAPACITY — the test most projects skip.
//
// HTTP load says nothing about how many *simultaneous* STOMP sessions the app
// can hold. Each one pins a WebSocket, a session registry entry and broker
// subscriptions for its whole lifetime, so the limiting resource is concurrency
// over time, not requests per second.
//
// Targets /ws-native (raw WebSocket + STOMP, used by the mobile client) rather
// than /ws, because SockJS negotiation would measure the fallback handshake
// instead of the socket itself. Auth is the Authorization native header on the
// STOMP CONNECT frame — see WebSocketAuthInterceptor.
//
// Run:
//   docker compose --profile loadtest run --rm --user "$(id -u):$(id -g)" \
//     k6 run /scripts/realtime.js

const WS_URL = `${BASE_URL.replace(/^http/, 'ws')}/ws-native`;
const HOLD_SECONDS = Number(__ENV.HOLD_SECONDS || 60);

const connected = new Counter('ws_connected');
const connectFailed = new Counter('ws_connect_failed');
const connectTime = new Trend('ws_connect_ms', true);
const connectRate = new Rate('ws_connect_success');

const NULL = String.fromCharCode(0);

function stompFrame(command, headers, body) {
  const lines = Object.keys(headers).map((k) => `${k}:${headers[k]}`);
  return `${command}\n${lines.join('\n')}\n\n${body || ''}${NULL}`;
}

export const options = {
  scenarios: {
    // Open model so connections accumulate: 20 new sessions/s, each held open,
    // which is what a real morning-traffic ramp looks like.
    connections: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 2000,
      stages: [
        { target: 10, duration: '30s' },
        { target: 20, duration: '60s' },
        { target: 20, duration: '60s' },
      ],
    },
  },
  thresholds: {
    'ws_connect_success': ['rate>0.98'],
    'ws_connect_ms': ['p(95)<1000'],
  },
};

export function setup() {
  return { tokens: loginPool() };
}

export default function (data) {
  const token = tokenFor(data.tokens);
  const started = Date.now();
  let opened = false;

  const res = ws.connect(WS_URL, {}, function (socket) {
    socket.on('open', function () {
      socket.send(stompFrame('CONNECT', {
        'accept-version': '1.2',
        'heart-beat': '0,0',
        Authorization: `Bearer ${token}`,
      }));
    });

    socket.on('message', function (msg) {
      if (msg.indexOf('CONNECTED') === 0 && !opened) {
        opened = true;
        connected.add(1);
        connectRate.add(true);
        connectTime.add(Date.now() - started);

        // Subscribe to the destinations the real clients use, so the broker
        // holds genuine subscription state rather than an idle socket.
        socket.send(stompFrame('SUBSCRIBE', {
          id: `sub-notif-${__VU}`,
          destination: '/user/queue/notifications',
        }));
        socket.send(stompFrame('SUBSCRIBE', {
          id: `sub-feed-${__VU}`,
          destination: '/topic/feed',
        }));

        // Hold the session open, then close cleanly.
        socket.setTimeout(function () {
          socket.send(stompFrame('DISCONNECT', { receipt: `bye-${__VU}` }));
          socket.close();
        }, HOLD_SECONDS * 1000);
      }

      if (msg.indexOf('ERROR') === 0) {
        connectFailed.add(1);
        connectRate.add(false);
        socket.close();
      }
    });

    socket.on('error', function () {
      connectFailed.add(1);
      connectRate.add(false);
    });

    // Safety net so a silent server can't pin the VU forever.
    socket.setTimeout(function () {
      if (!opened) {
        connectFailed.add(1);
        connectRate.add(false);
        socket.close();
      }
    }, 10000);
  });

  check(res, { 'ws handshake 101': (r) => r && r.status === 101 });
  sleep(1);
}

export function handleSummary(data) {
  return {
    '/scripts/reports/realtime-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
