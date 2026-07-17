import messaging from '@react-native-firebase/messaging';
import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { api } from '@/lib/api';
import { setCachedDeviceToken } from '@/lib/device-token';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const PLATFORM = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

// messaging().requestPermission() is a deprecated no-op on Android (always
// resolves AUTHORIZED without prompting) — expo-notifications is what
// actually triggers the Android 13+ POST_NOTIFICATIONS runtime prompt.
async function requestPermission(): Promise<boolean> {
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

async function registerDeviceToken(deviceToken: string) {
  setCachedDeviceToken(deviceToken);
  try {
    await api.post('/devices', { token: deviceToken, platform: PLATFORM });
  } catch {
    // best-effort; retried on next foreground mount or token refresh
  }
}

function routeFor(data: Record<string, unknown>): Href {
  const type = typeof data.type === 'string' ? data.type : undefined;
  const referenceId = typeof data.referenceId === 'string' ? data.referenceId : undefined;
  if (type && type !== 'FOLLOW' && referenceId) {
    return `/post/${referenceId}` as Href;
  }
  return '/notifications';
}

export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  useEffect(() => {
    if (!token) return;

    let unsubTokenRefresh: (() => void) | undefined;
    let unsubForegroundMessage: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      await ensureAndroidChannel();
      const granted = await requestPermission();
      if (!granted || cancelled) return;

      const deviceToken = await messaging().getToken();
      if (cancelled) return;
      await registerDeviceToken(deviceToken);

      unsubTokenRefresh = messaging().onTokenRefresh(registerDeviceToken);

      unsubForegroundMessage = messaging().onMessage(async (remoteMessage) => {
        const { notification, data } = remoteMessage;
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
        if (!notification) return;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: notification.title ?? 'SocialHan',
            body: notification.body ?? '',
            data: data ?? {},
          },
          trigger: null,
        });
      });
    })();

    return () => {
      cancelled = true;
      unsubTokenRefresh?.();
      unsubForegroundMessage?.();
    };
  }, [token]);

  useEffect(() => {
    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string>;
      router.push(routeFor(data));
    });

    const unsubOpenedApp = messaging().onNotificationOpenedApp((remoteMessage) => {
      router.push(routeFor(remoteMessage.data ?? {}));
    });

    void messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          router.push(routeFor(remoteMessage.data ?? {}));
        }
      });

    return () => {
      tapSub.remove();
      unsubOpenedApp();
    };
  }, [router]);

  return <>{children}</>;
}
