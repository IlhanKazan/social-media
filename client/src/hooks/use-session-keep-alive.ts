import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

// Refresh this far before the access token actually expires, so an in-flight
// request never races the expiry boundary.
const REFRESH_MARGIN_MS = 60 * 1000;
// Never schedule a refresh tighter than this, to rule out a tight retry loop
// if the server ever returns a very short TTL.
const MIN_DELAY_MS = 5 * 1000;

/**
 * Keeps the access token fresh while the app is open.
 *
 * Without this, an idle tab silently loses its session: the 15-minute access
 * token expires, and nothing rotates it until something happens to make a REST
 * call and trip the 401 interceptor. The STOMP connection is the real casualty —
 * it authenticates once at CONNECT and then just retries with the same dead
 * token every 5s, so live messages and notifications stop arriving with no 401
 * anywhere to trigger recovery. The user sees "couldn't load" until they hit F5.
 *
 * Two triggers, because neither alone is sufficient:
 *  - a timer, for a tab that stays open and idle
 *  - focus/visibility, because timers don't fire reliably while the machine is
 *    asleep or the tab is discarded, so the timer may be long overdue on return
 *
 * Both go through the store's single-flight tryRefresh, so overlapping triggers
 * collapse into one rotation (the refresh token is single-use; two concurrent
 * calls would trip server-side reuse detection and kill the session).
 * The WebSocket provider is keyed on the token, so a rotation reconnects it.
 */
export function useSessionKeepAlive() {
  const token = useAuthStore((state) => state.token);
  const tokenExpiresAt = useAuthStore((state) => state.tokenExpiresAt);

  useEffect(() => {
    if (!token || !tokenExpiresAt) return;

    const refresh = () => {
      void useAuthStore.getState().tryRefresh();
    };

    const delay = Math.max(tokenExpiresAt - Date.now() - REFRESH_MARGIN_MS, MIN_DELAY_MS);
    const timer = window.setTimeout(refresh, delay);

    const refreshIfDue = () => {
      if (document.visibilityState !== 'visible') return;
      const expiry = useAuthStore.getState().tokenExpiresAt;
      if (expiry && Date.now() >= expiry - REFRESH_MARGIN_MS) {
        refresh();
      }
    };

    document.addEventListener('visibilitychange', refreshIfDue);
    window.addEventListener('focus', refreshIfDue);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', refreshIfDue);
      window.removeEventListener('focus', refreshIfDue);
    };
  }, [token, tokenExpiresAt]);
}
