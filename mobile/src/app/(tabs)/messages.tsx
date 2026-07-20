import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { ActionSheet } from '@/components/action-sheet';
import { ThemedRefreshControl } from '@/components/themed-refresh';
import { useConversations, useDeleteConversation } from '@/features/messaging/queries';
import { useNow } from '@/hooks/use-now';
import { formatShortRelativeTime } from '@/lib/relative-time';
import type { ConversationResponse, PublicAccountResponse } from '@/types/api';

function Avatar({ account }: { account: PublicAccountResponse }) {
  if (account.profileImageUrl) {
    return <Image source={{ uri: account.profileImageUrl }} style={{ width: 52, height: 52, borderRadius: 26 }} />;
  }
  return (
    <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-neutral-300 dark:bg-neutral-700">
      <Text className="text-base font-sans-bold text-neutral-700 dark:text-neutral-200">
        {account.username.substring(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

function ConversationRow({ conversation }: { conversation: ConversationResponse }) {
  const router = useRouter();
  const other = conversation.otherParticipant;
  const unread = conversation.unreadCount > 0;
  const now = useNow();
  const deleteConversation = useDeleteConversation();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  return (
    <Pressable
      className="flex-row items-center gap-3 px-4 py-3 active:bg-neutral-50 dark:active:bg-neutral-900"
      onPress={() =>
        router.push({
          pathname: '/conversation/[id]',
          params: { id: String(conversation.id), name: other.displayName || other.username },
        })
      }
      onLongPress={() => setDeleteConfirmOpen(true)}
    >
      <ActionSheet
        visible={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Bu sohbet silinsin mi? Yeni mesaj gelirse geri görünür."
        options={[
          {
            label: 'Sohbeti Sil',
            icon: Trash2,
            destructive: true,
            onPress: () => deleteConversation.mutate(conversation.id),
          },
        ]}
      />
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          router.push(`/user/${other.username}`);
        }}
      >
        <Avatar account={other} />
      </Pressable>
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text
            className="flex-1 font-sans-bold text-neutral-900 dark:text-neutral-50"
            numberOfLines={1}
          >
            {other.displayName || other.username}
          </Text>
          {conversation.lastMessageAt && (
            <Text className="ml-2 text-xs text-neutral-500">
              {formatShortRelativeTime(conversation.lastMessageAt, now)}
            </Text>
          )}
        </View>
        <View className="mt-0.5 flex-row items-center justify-between">
          <Text
            className={
              unread
                ? 'flex-1 text-sm font-sans-semibold text-neutral-900 dark:text-neutral-50'
                : 'flex-1 text-sm text-neutral-500'
            }
            numberOfLines={1}
          >
            {conversation.lastMessageContent ?? 'Sohbeti başlat'}
          </Text>
          {unread && (
            <View className="ml-2 min-w-[20px] items-center rounded-full bg-primary px-1.5 py-0.5">
              <Text className="text-xs font-sans-bold text-white">{conversation.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function MessagesScreen() {
  const query = useConversations();
  // Live conversation updates come from the app-wide MessagingProvider.

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
        <Text className="text-center text-neutral-500">Sohbetler yüklenemedi.</Text>
        <Pressable className="mt-4 rounded-full bg-primary px-5 py-2" onPress={() => query.refetch()}>
          <Text className="font-sans-semibold text-white">Tekrar Dene</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ConversationRow conversation={item} />}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <ThemedRefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8 pt-24">
            <Text className="text-center text-neutral-500">Henüz sohbet yok.</Text>
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
