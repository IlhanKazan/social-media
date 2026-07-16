import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';

import { PostCard } from '@/components/post-card';
import { useExplore, useFeed } from '@/features/posts/queries';
import type { FeedItemResponse, PostResponse } from '@/types/api';

type Tab = 'following' | 'explore';

interface FeedListProps {
  query: ReturnType<typeof useFeed> | ReturnType<typeof useExplore>;
  emptyMessage: string;
}

function FeedList({ query, emptyMessage }: FeedListProps) {
  const items: (FeedItemResponse | PostResponse)[] =
    query.data?.pages.flatMap((page): (FeedItemResponse | PostResponse)[] => page.content) ?? [];

  if (query.status === 'pending') {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (query.status === 'error') {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-neutral-500">Failed to load the feed.</Text>
        <Pressable className="mt-4 rounded-full bg-primary px-5 py-2" onPress={() => query.refetch()}>
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item, index) => {
        if ('post' in item) {
          return `${item.type}-${item.post.id}-${item.reposter?.id ?? 'none'}-${index}`;
        }
        return String(item.id);
      }}
      renderItem={({ item }) =>
        'post' in item ? (
          <PostCard post={item.post} feedType={item.type} reposter={item.reposter} />
        ) : (
          <PostCard post={item} />
        )
      }
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) {
          void query.fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
      }
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center px-8 pt-24">
          <Text className="text-center text-neutral-500">{emptyMessage}</Text>
        </View>
      }
      ListFooterComponent={
        query.isFetchingNextPage ? (
          <View className="items-center py-4">
            <ActivityIndicator />
          </View>
        ) : null
      }
      contentContainerStyle={items.length === 0 ? { flexGrow: 1 } : undefined}
    />
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('following');

  const following = useFeed();
  const explore = useExplore();

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <View className="flex-row border-b border-neutral-100 dark:border-neutral-800">
        {(['following', 'explore'] as const).map((tab) => (
          <Pressable
            key={tab}
            className="flex-1 items-center py-3"
            onPress={() => setActiveTab(tab)}
          >
            <Text
              className={
                activeTab === tab
                  ? 'font-bold text-neutral-900 dark:text-neutral-50'
                  : 'font-medium text-neutral-500'
              }
            >
              {tab === 'following' ? 'Following' : 'Explore'}
            </Text>
            {activeTab === tab && <View className="mt-2 h-1 w-14 rounded-full bg-primary" />}
          </Pressable>
        ))}
      </View>

      {activeTab === 'following' ? (
        <FeedList query={following} emptyMessage="No posts yet. Follow some people to fill your feed!" />
      ) : (
        <FeedList query={explore} emptyMessage="No posts yet." />
      )}

      <Pressable
        className="absolute bottom-6 right-5 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-80"
        onPress={() => router.push('/compose')}
      >
        <Plus size={26} color="#ffffff" />
      </Pressable>
    </View>
  );
}
