import '../global.css';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';

import { SessionGate } from '@/components/session-gate';
import { MessagingProvider } from '@/features/messaging/messaging-provider';
import { queryClient } from '@/lib/query-client';
import { PushNotificationProvider } from '@/lib/push';
import { WebSocketProvider } from '@/lib/ws';
// Import for its side effect: rehydrating the theme store re-applies the saved
// mode to NativeWind before first paint.
import '@/stores/theme-store';

export default function RootLayout() {
  // NativeWind's effective scheme (respects the persisted Light/Dark/System choice).
  const { colorScheme } = useColorScheme();
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
          <WebSocketProvider>
            <MessagingProvider>
              <PushNotificationProvider>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: background },
                  }}
                >
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="conversation/[id]" />
                  <Stack.Screen name="user/[username]/index" />
                  <Stack.Screen name="user/[username]/follows" />
                  <Stack.Screen name="settings" />
                  <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
                </Stack>
              </PushNotificationProvider>
            </MessagingProvider>
          </WebSocketProvider>
        </SessionGate>
        <StatusBar style="auto" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
