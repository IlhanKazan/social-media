import { Image } from 'expo-image';
import { Redirect, Tabs } from 'expo-router';
import { Bell, Home, Mail, Search } from 'lucide-react-native';
import { Platform, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUnreadMessageCount } from '@/features/messaging/queries';
import { useUnreadCount } from '@/features/notifications/queries';
import { useAuthStore } from '@/stores/auth-store';

function AvatarTabIcon({ focused, size }: { focused: boolean; size: number }) {
  const account = useAuthStore((s) => s.account);
  const ring = focused ? 2 : 0;

  if (account?.profileImageUrl) {
    return (
      <View
        style={{
          borderWidth: ring,
          borderColor: focused ? '#71767b' : 'transparent',
          borderRadius: (size + 6) / 2,
          padding: 1,
        }}
      >
        <Image
          source={{ uri: account.profileImageUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      </View>
    );
  }

  return (
    <View
      className="items-center justify-center bg-neutral-300 dark:bg-neutral-700"
      style={{
        width: size + 2,
        height: size + 2,
        borderRadius: (size + 2) / 2,
        borderWidth: ring,
        borderColor: focused ? '#71767b' : 'transparent',
      }}
    >
      <Text className="font-sans-bold text-[10px] text-neutral-700 dark:text-neutral-200">
        {(account?.username ?? '?').substring(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  const token = useAuthStore((s) => s.token);
  const colorScheme = useColorScheme();
  const dark = colorScheme === 'dark';
  const unreadCount = useUnreadCount(!!token);
  const unreadMessages = useUnreadMessageCount();
  const insets = useSafeAreaInsets();

  if (!token) {
    return <Redirect href="/login" />;
  }

  const bg = dark ? '#0a0a0a' : '#ffffff';
  const border = dark ? '#262626' : '#e5e5e5';
  const foreground = dark ? '#f5f5f5' : '#0a0a0a';

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: foreground,
        tabBarInactiveTintColor: '#71767b',
        tabBarStyle: {
          backgroundColor: bg,
          borderTopColor: border,
          borderTopWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          height: (Platform.OS === 'ios' ? 49 : 56) + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 11 },
        headerStyle: { backgroundColor: bg },
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: 'Inter_700Bold', fontSize: 19, color: foreground },
        headerTintColor: foreground,
        sceneStyle: { backgroundColor: bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Anasayfa',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Ara',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Bildirimler',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
          tabBarBadge: unreadCount.data ? unreadCount.data : undefined,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mesajlar',
          tabBarIcon: ({ color, size }) => <Mail color={color} size={size} />,
          tabBarBadge: unreadMessages.data ? unreadMessages.data : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused, size }) => <AvatarTabIcon focused={focused} size={size + 2} />,
        }}
      />
    </Tabs>
  );
}
