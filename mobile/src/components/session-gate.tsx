import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';

import { useAuthStore } from '@/stores/auth-store';

export function SessionGate({ children }: { children: React.ReactNode }) {
  const [restoring, setRestoring] = useState(true);
  const hydrated = useAuthStore((s) => s.hydrated);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (!hydrated) return;
    useAuthStore
      .getState()
      .tryRefresh()
      .finally(() => setRestoring(false));
  }, [hydrated]);

  useEffect(() => {
    // The access token has a 15min TTL. If it expires while the app is
    // backgrounded, the STOMP client (keyed on the store's `token`) will
    // otherwise keep silently reconnecting with the dead token forever,
    // since nothing forces a REST call to trip the 401-refresh interceptor.
    // Refreshing proactively on foreground resume both re-arms REST calls
    // and (via the token change) makes WebSocketProvider reconnect fresh.
    const subscription = AppState.addEventListener('change', (nextState) => {
      const cameToForeground = appState.current.match(/inactive|background/) && nextState === 'active';
      appState.current = nextState;
      if (cameToForeground && useAuthStore.getState().token) {
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
