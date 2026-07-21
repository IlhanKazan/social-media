import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';

import { useAuthStore } from '@/stores/auth-store';

// Some Android OEM skins (MIUI in particular) briefly report an
// inactive->active AppState transition when a soft keyboard opens/closes,
// not just on real backgrounding. Without a floor, that turns every
// keyboard toggle into a refresh-token network round-trip + store update
// + app-wide re-render — which is what free-floating keyboard jitter
// usually turns out to be. Real backgrounding is rare; keyboard noise isn't.
const MIN_REFRESH_INTERVAL_MS = 60_000;

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

  if (!hydrated || restoring) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  return <>{children}</>;
}
