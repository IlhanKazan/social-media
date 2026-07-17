import { formatDistanceToNowStrict } from 'date-fns';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { useConversations } from '@/features/messaging/queries';
import type { ConversationResponse, PublicAccountResponse } from '@/types/api';

function Avatar({ account }: { account: PublicAccountResponse }) {
  if (account.profileImageUrl) {
    return <Image source={{ uri: account.profileImageUrl }} style={{ width: 52, height: 52, borderRadius: 26 }} />;
  }
  return (
    <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-neutral-300 dark:bg-neutral-700">
      <Text className="text-base font-bold text-neutral-700 dark:text-neutral-200">
        {account.username.substring(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

function ConversationRow({ conversation }: { conversation: ConversationResponse }) {
  const router = useRouter();
  const other = conversation.otherParticipant;
  const unread = conversation.unreadCount > 0;

  return (
    <Pressable
      className="flex-row items-center gap-3 px-4 py-3 active:bg-neutral-50 dark:active:bg-neutral-900"
      onPress={() =>
        router.push({
          pathname: '/conversation/[id]',
          params: { id: String(conversation.id), name: other.displayName || other.username },
        })
      }
    >
      <Avatar account={other} />
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text
            className="flex-1 font-bold text-neutral-900 dark:text-neutral-50"
            numberOfLines={1}
          >
            {other.displayName || other.username}
          </Text>
          {conversation.lastMessageAt && (
            <Text className="ml-2 text-xs text-neutral-500">
              {formatDistanceToNowStrict(new Date(conversation.lastMessageAt), { addSuffix: false })}
            </Text>
          )}
        </View>
        <View className="mt-0.5 flex-row items-center justify-between">
          <Text
            className={
              unread
                ? 'flex-1 text-sm font-semibold text-neutral-900 dark:text-neutral-50'
                : 'flex-1 text-sm text-neutral-500'
            }
            numberOfLines={1}
          >
            {conversation.lastMessageContent ?? 'Start the conversation'}
          </Text>
          {unread && (
            <View className="ml-2 min-w-[20px] items-center rounded-full bg-primary px-1.5 py-0.5">
              <Text className="text-xs font-bold text-white">{conversation.unreadCount}</Text>
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
        <Text className="text-center text-neutral-500">Failed to load conversations.</Text>
        <Pressable className="mt-4 rounded-full bg-primary px-5 py-2" onPress={() => query.refetch()}>
          <Text className="font-semibold text-white">Retry</Text>
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
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8 pt-24">
            <Text className="text-center text-neutral-500">No conversations yet.</Text>
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
