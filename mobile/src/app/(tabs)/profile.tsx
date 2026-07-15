import { Pressable, Text, View } from 'react-native';

import { useAuthStore } from '@/stores/auth-store';

export default function ProfileScreen() {
  const account = useAuthStore((s) => s.account);
  const logout = useAuthStore((s) => s.logout);

  return (
    <View className="flex-1 items-center justify-center bg-white px-8 dark:bg-neutral-950">
      <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
        @{account?.username}
      </Text>
      <Text className="mt-2 text-neutral-500 dark:text-neutral-400">
        Full profile comes in M8.
      </Text>
      <Pressable
        className="mt-8 rounded-xl border border-red-500 px-6 py-3 active:opacity-80"
        onPress={() => logout()}
      >
        <Text className="font-semibold text-red-500">Log out</Text>
      </Pressable>
    </View>
  );
}
