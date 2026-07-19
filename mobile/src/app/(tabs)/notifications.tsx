import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { ActionSheet } from '@/components/action-sheet';
import { NotificationCard } from '@/components/notification-card';
import { ThemedRefreshControl } from '@/components/themed-refresh';
import {
  useDeleteAllNotifications,
  useMarkAllAsRead,
  useNotifications,
  useUnreadCount,
} from '@/features/notifications/queries';

export default function NotificationsScreen() {
  const query = useNotifications();
  const unreadCount = useUnreadCount();
  const markAllAsRead = useMarkAllAsRead();
  const deleteAll = useDeleteAllNotifications();
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);

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
        <Text className="text-center text-neutral-500">Bildirimler yüklenemedi.</Text>
        <Pressable className="mt-4 rounded-full bg-primary px-5 py-2" onPress={() => query.refetch()}>
          <Text className="font-sans-semibold text-white">Tekrar Dene</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      {items.length > 0 && (
        <View className="flex-row items-center justify-end gap-5 border-b border-neutral-100 px-4 py-2 dark:border-neutral-800">
          {(unreadCount.data ?? 0) > 0 && (
            <Pressable onPress={() => markAllAsRead.mutate()} disabled={markAllAsRead.isPending}>
              <Text className="text-sm font-sans-medium text-primary">Tümünü Okundu İşaretle</Text>
            </Pressable>
          )}
          <Pressable
            className="flex-row items-center gap-1"
            onPress={() => setDeleteAllConfirmOpen(true)}
            disabled={deleteAll.isPending}
          >
            <Trash2 size={14} color="#ef4444" />
            <Text className="text-sm font-sans-medium text-red-500">Tümünü Sil</Text>
          </Pressable>
        </View>
      )}

      <ActionSheet
        visible={deleteAllConfirmOpen}
        onClose={() => setDeleteAllConfirmOpen(false)}
        title="Tüm bildirimler silinsin mi? Bu işlem geri alınamaz."
        options={[
          {
            label: 'Tümünü Sil',
            icon: Trash2,
            destructive: true,
            onPress: () => deleteAll.mutate(),
          },
        ]}
      />

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
          <ThemedRefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => {
              void query.refetch();
              void unreadCount.refetch();
            }}
          />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8 pt-24">
            <Text className="text-center text-neutral-500">Henüz bildirim yok.</Text>
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
