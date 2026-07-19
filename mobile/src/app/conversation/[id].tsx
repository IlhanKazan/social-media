import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ImagePlus, Send, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useMessaging } from '@/features/messaging/messaging-provider';
import { useMarkConversationRead, useMessages, useSendDmImage } from '@/features/messaging/queries';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { useAuthStore } from '@/stores/auth-store';
import type { MessageResponse, SharedPostPreview } from '@/types/api';

function SharedPostCard({ post }: { post: SharedPostPreview }) {
  return (
    <View className="mt-1 rounded-xl border border-neutral-200 p-2 dark:border-neutral-700">
      <Text className="text-xs font-sans-bold text-neutral-900 dark:text-neutral-50">
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
  const [showDetails, setShowDetails] = useState(false);

  const detailText = () => {
    const time = format(new Date(message.createdAt), 'd MMM HH:mm', { locale: tr });
    if (!mine) return time;
    if (message.isOptimistic) return 'Gönderiliyor…';
    if (message.readAt) {
      return `${time} · Okundu ${format(new Date(message.readAt), 'HH:mm', { locale: tr })}`;
    }
    return `${time} · İletildi`;
  };

  return (
    <Pressable
      className={`my-0.5 max-w-[80%] ${mine ? 'self-end' : 'self-start'}`}
      onPress={() => setShowDetails((v) => !v)}
    >
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
          <Text className={mine ? 'text-[16px] text-white' : 'text-[16px] text-neutral-900 dark:text-neutral-50'}>
            {message.content}
          </Text>
        )}
      </View>
      {(showDetails || message.isOptimistic) && (
        <Text className={`mt-0.5 text-[11px] text-neutral-500 ${mine ? 'pr-1 text-right' : 'pl-1'}`}>
          {detailText()}
        </Text>
      )}
    </Pressable>
  );
}

export default function ConversationScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const conversationId = Number(params.id);
  const account = useAuthStore((s) => s.account);

  const query = useMessages(conversationId);
  const markRead = useMarkConversationRead();
  const { sendMessage, setActiveConversationId } = useMessaging();
  const sendImage = useSendDmImage(conversationId);
  const [draft, setDraft] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Alert.alert('Fotoğraf çok büyük', 'Fotoğraf 5MB’den küçük olmalı.');
      return;
    }
    setImageUri(asset.uri);
  };

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

    if (imageUri) {
      sendImage.mutate(
        { uri: imageUri, caption: trimmed || undefined },
        {
          onError: () => Alert.alert('Gönderilemedi', 'Fotoğraf yüklenirken bir hata oluştu.'),
        }
      );
      setImageUri(null);
      setDraft('');
      return;
    }

    if (!trimmed) return;
    sendMessage(conversationId, trimmed);
    setDraft('');
  };

  const canSend = (draft.trim().length > 0 || !!imageUri) && !sendImage.isPending;
  const keyboardHeight = useKeyboardHeight();

  return (
    <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
      <View className="flex-1 bg-white dark:bg-neutral-950">
      <Stack.Screen options={{ title: params.name ?? 'Sohbet', headerShown: true }} />

      {query.status === 'pending' ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : query.status === 'error' ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-neutral-500">Mesajlar yüklenemedi.</Text>
          <Pressable className="mt-4 rounded-full bg-primary px-5 py-2" onPress={() => query.refetch()}>
            <Text className="font-sans-semibold text-white">Tekrar Dene</Text>
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
              <Text className="text-neutral-500">Merhaba de 👋</Text>
            </View>
          }
        />
      )}

      <View className="border-t border-neutral-100 dark:border-neutral-800">
        {imageUri && (
          <View className="flex-row px-3 pt-2">
            <View>
              <Image source={{ uri: imageUri }} style={{ width: 84, height: 84, borderRadius: 12 }} contentFit="cover" />
              <Pressable
                className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-black/70"
                onPress={() => setImageUri(null)}
                disabled={sendImage.isPending}
              >
                <X size={13} color="#ffffff" />
              </Pressable>
            </View>
          </View>
        )}
        <View className="flex-row items-end gap-2 px-3 py-2">
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full active:bg-neutral-100 dark:active:bg-neutral-900"
            onPress={pickImage}
            disabled={sendImage.isPending || !!imageUri}
          >
            <ImagePlus size={22} color={imageUri ? '#a3a3a3' : '#208AEF'} />
          </Pressable>
          <TextInput
            className="max-h-28 flex-1 rounded-2xl bg-neutral-100 px-4 py-2.5 text-[16px] text-neutral-900 dark:bg-neutral-900 dark:text-neutral-50"
            placeholder="Mesaj"
            placeholderTextColor="#737373"
            multiline
            value={draft}
            onChangeText={setDraft}
          />
          <Pressable
            className={canSend ? 'h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80' : 'h-11 w-11 items-center justify-center rounded-full bg-primary/40'}
            onPress={handleSend}
            disabled={!canSend}
          >
            {sendImage.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Send size={20} color="#ffffff" />
            )}
          </Pressable>
        </View>
      </View>
      </View>
    </View>
  );
}
