import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Text, View } from 'react-native';

import { useAuthStore } from '@/stores/auth-store';
import { API_BASE_URL, HAS_DEV_API_IN_RELEASE } from '@/lib/env';

// Some Android OEM skins (MIUI in particular) briefly report an
// inactive->active AppState transition when a soft keyboard opens/closes,
// not just on real backgrounding. Without a floor, that turns every
// keyboard toggle into a refresh-token network round-trip + store update
// + app-wide re-render — which is what free-floating keyboard jitter
// usually turns out to be. Real backgrounding is rare; keyboard noise isn't.
const MIN_REFRESH_INTERVAL_MS = 60_000;

// Rotate this far ahead of expiry so an in-flight request never races the
// boundary, and never schedule tighter than the floor.
const REFRESH_MARGIN_MS = 60_000;
const MIN_TIMER_DELAY_MS = 5_000;

export function SessionGate({ children }: { children: React.ReactNode }) {
  const [restoring, setRestoring] = useState(true);
  const hydrated = useAuthStore((s) => s.hydrated);
  const appState = useRef(AppState.currentState);
  const lastRefreshAt = useRef(0);

  useEffect(() => {
    if (!hydrated) return;
    lastRefreshAt.current = Date.now();
    useAuthStore
      .getState()
      .tryRefresh()
      .finally(() => setRestoring(false));
  }, [hydrated]);

  useEffect(() => {
    // The access token has a 15min TTL. If it expires while the app is
    // truly backgrounded for a while, the STOMP client (keyed on the store's
    // `token`) would otherwise keep silently reconnecting with the dead
    // token forever, since nothing forces a REST call to trip the
    // 401-refresh interceptor. Refreshing on genuine foreground resume both
    // re-arms REST calls and (via the token change) makes WebSocketProvider
    // reconnect fresh — but only when it's actually been a while.
    const subscription = AppState.addEventListener('change', (nextState) => {
      // Only 'background' counts as a real departure — MIUI-style 'inactive'
      // blips on keyboard toggle shouldn't trigger a refresh (see query-client.ts).
      const cameToForeground = appState.current === 'background' && nextState === 'active';
      appState.current = nextState;
      const dueForRefresh = Date.now() - lastRefreshAt.current > MIN_REFRESH_INTERVAL_MS;
      if (cameToForeground && dueForRefresh && useAuthStore.getState().token) {
        lastRefreshAt.current = Date.now();
        void useAuthStore.getState().tryRefresh();
      }
    });
    return () => subscription.remove();
  }, []);

  const token = useAuthStore((s) => s.token);
  const tokenExpiresAt = useAuthStore((s) => s.tokenExpiresAt);

  useEffect(() => {
    // The AppState listener above only fires on a real background->foreground
    // trip. An app left open and idle in the foreground never gets one, so its
    // token still expires and the STOMP connection dies silently. Rotate on a
    // timer too, shortly before expiry.
    if (!token || !tokenExpiresAt) return;

    const delay = Math.max(tokenExpiresAt - Date.now() - REFRESH_MARGIN_MS, MIN_TIMER_DELAY_MS);
    const timer = setTimeout(() => {
      lastRefreshAt.current = Date.now();
      void useAuthStore.getState().tryRefresh();
    }, delay);

    return () => clearTimeout(timer);
  }, [token, tokenExpiresAt]);

  // Fail loudly instead of behaving like a broken app: a release bundle aimed at
  // localhost cannot reach anything, and every downstream symptom (no login, no
  // messages) looks like a different bug.
  if (HAS_DEV_API_IN_RELEASE) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', textAlign: 'center' }}>Yapılandırma hatası</Text>
        <Text style={{ textAlign: 'center', opacity: 0.7 }}>
          Bu sürüm {API_BASE_URL} adresine bağlanmaya çalışıyor. Güncellemeyi
          `--environment production` ile yeniden yayınlayın.
        </Text>
      </View>
    );
  }

  if (!hydrated || restoring) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  return <>{children}</>;
}
