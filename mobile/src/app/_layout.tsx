import '../global.css';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { SessionGate } from '@/components/session-gate';
import { queryClient } from '@/lib/query-client';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';

  // Match the nav container + card background to the screens' bg so
  // transitions don't flash white (screens use bg-white / dark:bg-neutral-950).
  const background = dark ? '#0a0a0a' : '#ffffff';
  const theme = dark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background } };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={theme}>
        <SessionGate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: background },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
          </Stack>
        </SessionGate>
        <StatusBar style="auto" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
