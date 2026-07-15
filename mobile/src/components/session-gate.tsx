import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuthStore } from '@/stores/auth-store';

export function SessionGate({ children }: { children: React.ReactNode }) {
  const [restoring, setRestoring] = useState(true);
  const hydrated = useAuthStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;
    useAuthStore
      .getState()
      .tryRefresh()
      .finally(() => setRestoring(false));
  }, [hydrated]);

  if (!hydrated || restoring) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#208AEF" />
      </View>
    );
  }

  return <>{children}</>;
}
