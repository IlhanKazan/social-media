import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { NotificationCard } from '@/components/notification-card';
import { useMarkAllAsRead, useNotifications, useUnreadCount } from '@/features/notifications/queries';

export default function NotificationsScreen() {
  const query = useNotifications();
  const unreadCount = useUnreadCount();
  const markAllAsRead = useMarkAllAsRead();

  const items = query.data?.pages.flatMap((page) => page.content) ?? [];

  if (query.status === 'pending') {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (query.status === 'error') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8 dark:bg-neutral-950">
        <Text className="text-center text-neutral-500">Failed to load notifications.</Text>
        <Pressable className="mt-4 rounded-full bg-primary px-5 py-2" onPress={() => query.refetch()}>
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      {(unreadCount.data ?? 0) > 0 && (
        <View className="flex-row justify-end border-b border-neutral-100 px-4 py-2 dark:border-neutral-800">
          <Pressable onPress={() => markAllAsRead.mutate()}>
            <Text className="text-sm font-medium text-primary">Mark all as read</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <NotificationCard notification={item} />}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => {
              void query.refetch();
              void unreadCount.refetch();
            }}
          />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8 pt-24">
            <Text className="text-center text-neutral-500">No notifications yet.</Text>
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
    </View>
  );
}
