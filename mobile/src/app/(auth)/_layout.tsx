import { Redirect, Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { useAuthStore } from '@/stores/auth-store';

export default function AuthLayout() {
  const token = useAuthStore((s) => s.token);
  const colorScheme = useColorScheme();

  if (token) {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colorScheme === 'dark' ? '#0a0a0a' : '#ffffff' },
      }}
    />
  );
}
