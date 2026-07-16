import { Redirect, Tabs } from 'expo-router';
import { Bell, Home, Mail, User } from 'lucide-react-native';
import { useColorScheme } from 'react-native';

import { useAuthStore } from '@/stores/auth-store';

export default function TabsLayout() {
  const token = useAuthStore((s) => s.token);
  const colorScheme = useColorScheme();

  if (!token) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#208AEF',
        headerShown: true,
        sceneStyle: { backgroundColor: colorScheme === 'dark' ? '#0a0a0a' : '#ffffff' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <Mail color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
