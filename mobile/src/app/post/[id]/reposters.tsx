import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { useReposters } from '@/features/posts/queries';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { PublicAccountResponse } from '@/types/api';

function ReposterRow({ user }: { user: PublicAccountResponse }) {
  const router = useRouter();
  const account = useAuthStore((s) => s.account);
  const [following, setFollowing] = useState(user.isFollowing);
  const [busy, setBusy] = useState(false);
  const isSelf = user.id === account?.id;

  const toggle = async () => {
    const next = !following;
    setFollowing(next);
    setBusy(true);
    try {
      if (next) {
        await api.post(`/follow/${user.id}`);
      } else {
        await api.delete(`/follow/${user.id}`);
      }
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      className="flex-row items-center gap-3 px-4 py-3 active:bg-neutral-50 dark:active:bg-neutral-900"
      onPress={() => router.push(`/user/${user.username}`)}
    >
      {user.profileImageUrl ? (
        <Image source={{ uri: user.profileImageUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
      ) : (
        <View className="h-11 w-11 items-center justify-center rounded-full bg-neutral-300 dark:bg-neutral-700">
          <Text className="text-sm font-sans-bold text-neutral-700 dark:text-neutral-200">
            {user.username.substring(0, 2).toUpperCase()}
          </Text>
        </View>
      )}

      <View className="flex-1">
        <Text className="font-sans-bold text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
          {user.displayName || user.username}
        </Text>
        <Text className="text-sm text-neutral-500" numberOfLines={1}>
          @{user.username}
        </Text>
      </View>

      {!isSelf && (
        <Pressable
          className={
            following
              ? 'rounded-full border border-neutral-300 px-4 py-1.5 active:opacity-70 dark:border-neutral-700'
              : 'rounded-full bg-primary px-4 py-1.5 active:opacity-80'
          }
          onPress={toggle}
          disabled={busy}
        >
          <Text
            className={
              following ? 'text-sm font-sans-bold text-neutral-900 dark:text-neutral-50' : 'text-sm font-sans-bold text-white'
            }
          >
            {following ? 'Takip Ediliyor' : 'Takip Et'}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}

export default function RepostersScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const postId = Number(params.id);
  const query = useReposters(postId);
  const items = query.data?.pages.flatMap((page) => page.content) ?? [];

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <Stack.Screen options={{ title: 'Yeniden Paylaşanlar', headerShown: true }} />

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ReposterRow user={item} />}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          query.status === 'pending' ? (
            <View className="items-center py-10">
              <ActivityIndicator />
            </View>
          ) : (
            <View className="items-center py-10">
              <Text className="text-neutral-500">Henüz repost yok.</Text>
            </View>
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View className="items-center py-4">
              <ActivityIndicator />
            </View>
          ) : null
        }
      />
    </View>
  );
}
