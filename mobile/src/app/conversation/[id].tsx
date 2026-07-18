import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useMessaging } from '@/features/messaging/messaging-provider';
import { useMarkConversationRead, useMessages } from '@/features/messaging/queries';
import { useAuthStore } from '@/stores/auth-store';
import type { MessageResponse, SharedPostPreview } from '@/types/api';

function SharedPostCard({ post }: { post: SharedPostPreview }) {
  return (
    <View className="mt-1 rounded-xl border border-neutral-200 p-2 dark:border-neutral-700">
      <Text className="text-xs font-bold text-neutral-900 dark:text-neutral-50">
        {post.author.displayName || post.author.username}
      </Text>
      {post.contentSnippet && (
        <Text className="mt-0.5 text-xs text-neutral-500" numberOfLines={3}>
          {post.contentSnippet}
        </Text>
      )}
    </View>
  );
}

function MessageBubble({ message, mine }: { message: MessageResponse; mine: boolean }) {
  return (
    <View className={`my-0.5 max-w-[80%] ${mine ? 'self-end' : 'self-start'}`}>
      <View
        className={
          mine
            ? 'rounded-2xl rounded-br-md bg-primary px-3.5 py-2'
            : 'rounded-2xl rounded-bl-md bg-neutral-200 px-3.5 py-2 dark:bg-neutral-800'
        }
      >
        {message.imageUrl && (
          <Image
            source={{ uri: message.imageUrl }}
            style={{ width: 200, height: 200, borderRadius: 12, marginBottom: message.content ? 6 : 0 }}
            contentFit="cover"
          />
        )}
        {message.sharedPost && <SharedPostCard post={message.sharedPost} />}
        {message.content && (
          <Text className={mine ? 'text-[15px] text-white' : 'text-[15px] text-neutral-900 dark:text-neutral-50'}>
            {message.content}
          </Text>
        )}
      </View>
      {mine && (
        <Text className="mt-0.5 pr-1 text-right text-[10px] text-neutral-400">
          {message.isOptimistic ? 'Sending…' : message.readAt ? 'Read' : 'Sent'}
        </Text>
      )}
    </View>
  );
}

export default function ConversationScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const conversationId = Number(params.id);
  const account = useAuthStore((s) => s.account);

  const query = useMessages(conversationId);
  const markRead = useMarkConversationRead();
  const { sendMessage, setActiveConversationId } = useMessaging();
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!Number.isFinite(conversationId)) return;
    // Tell the global socket this conversation is on-screen so incoming
    // messages here auto-mark-read instead of bumping the unread badge.
    setActiveConversationId(conversationId);
    markRead.mutate(conversationId);
    return () => setActiveConversationId(undefined);
    // markRead identity is stable enough; only re-run when the conversation changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const messages = useMemo(
    () => query.data?.pages.flatMap((page) => page.content) ?? [],
    [query.data]
  );

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    sendMessage(conversationId, trimmed);
    setDraft('');
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white dark:bg-neutral-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen options={{ title: params.name ?? 'Conversation', headerShown: true }} />

      {query.status === 'pending' ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : query.status === 'error' ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-neutral-500">Failed to load messages.</Text>
          <Pressable className="mt-4 rounded-full bg-primary px-5 py-2" onPress={() => query.refetch()}>
            <Text className="font-semibold text-white">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={messages}
          inverted
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <MessageBubble message={item} mine={item.sender.id === account?.id} />
          )}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              void query.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <View className="items-center py-4">
                <ActivityIndicator />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-24" style={{ transform: [{ scaleY: -1 }] }}>
              <Text className="text-neutral-500">Say hi 👋</Text>
            </View>
          }
        />
      )}

      <View className="flex-row items-end gap-2 border-t border-neutral-100 px-3 py-2 dark:border-neutral-800">
        <TextInput
          className="max-h-28 flex-1 rounded-2xl bg-neutral-100 px-4 py-2.5 text-base text-neutral-900 dark:bg-neutral-900 dark:text-neutral-50"
          placeholder="Message"
          placeholderTextColor="#737373"
          multiline
          value={draft}
          onChangeText={setDraft}
        />
        <Pressable
          className={draft.trim() ? 'h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80' : 'h-11 w-11 items-center justify-center rounded-full bg-primary/40'}
          onPress={handleSend}
          disabled={!draft.trim()}
        >
          <Send size={20} color="#ffffff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
