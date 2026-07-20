import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ImagePlus, Send, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMessaging } from '@/features/messaging/messaging-provider';
import {
  useConversations,
  useMarkConversationRead,
  useMessages,
  useSendDmImage,
} from '@/features/messaging/queries';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { useAuthStore } from '@/stores/auth-store';
import type { MessageResponse, SharedPostPreview } from '@/types/api';

function SharedPostCard({ post }: { post: SharedPostPreview }) {
  const router = useRouter();
  return (
    <Pressable
      className="my-1 w-60 rounded-xl border border-neutral-200 bg-white p-2.5 active:opacity-80 dark:border-neutral-700 dark:bg-neutral-900"
      onPress={() => router.push(`/post/${post.id}`)}
    >
      <View className="mb-1 flex-row items-center gap-1.5">
        {post.author.profileImageUrl ? (
          <Image
            source={{ uri: post.author.profileImageUrl }}
            style={{ width: 20, height: 20, borderRadius: 10 }}
            contentFit="cover"
          />
        ) : (
          <View className="h-5 w-5 items-center justify-center rounded-full bg-neutral-300 dark:bg-neutral-700">
            <Text className="text-[9px] font-sans-bold text-neutral-700 dark:text-neutral-200">
              {post.author.username.substring(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <Text className="shrink text-[13px] font-sans-semibold text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
          {post.author.displayName || post.author.username}
        </Text>
        <Text className="shrink text-[13px] text-neutral-500" numberOfLines={1}>
          @{post.author.username}
        </Text>
      </View>
      {post.contentSnippet && (
        <Text className="text-[13px] leading-snug text-neutral-900 dark:text-neutral-50" numberOfLines={3}>
          {post.contentSnippet}
        </Text>
      )}
      {post.imageUrl && (
        <Image
          source={{ uri: post.imageUrl }}
          style={{ marginTop: 6, borderRadius: 8, width: '100%', height: 128 }}
          contentFit="cover"
        />
      )}
    </Pressable>
  );
}

function ChatImage({
  uri,
  width,
  onPress,
}: {
  uri: string;
  width: number;
  onPress: () => void;
}) {
  const [aspectRatio, setAspectRatio] = useState(1);
  const height = Math.min(Math.max(width / aspectRatio, 140), 340);
  return (
    <Pressable onPress={onPress} className="active:opacity-90">
      <Image
        source={{ uri }}
        style={{ width, height }}
        contentFit="cover"
        onLoad={(e) => {
          if (e.source.width && e.source.height) {
            setAspectRatio(e.source.width / e.source.height);
          }
        }}
      />
    </Pressable>
  );
}

function MessageBubble({
  message,
  mine,
  imageWidth,
  onImagePress,
}: {
  message: MessageResponse;
  mine: boolean;
  imageWidth: number;
  onImagePress: (uri: string) => void;
}) {
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

  const hasText = !!message.content;
  const hasImage = !!message.imageUrl;

  return (
    <Pressable
      className={`my-0.5 max-w-[80%] ${mine ? 'self-end' : 'self-start'}`}
      onPress={() => setShowDetails((v) => !v)}
    >
      <View
        className={
          mine
            ? 'overflow-hidden rounded-2xl rounded-br-md bg-primary'
            : 'overflow-hidden rounded-2xl rounded-bl-md bg-neutral-200 dark:bg-neutral-800'
        }
      >
        {hasImage && (
          <ChatImage
            uri={message.imageUrl!}
            width={imageWidth}
            onPress={() => onImagePress(message.imageUrl!)}
          />
        )}
        {message.sharedPost && (
          <View className="px-1.5 pt-0.5">
            <SharedPostCard post={message.sharedPost} />
          </View>
        )}
        {hasText && (
          <Text
            className={
              mine
                ? 'px-3.5 py-2 text-[16px] leading-[22px] text-white'
                : 'px-3.5 py-2 text-[16px] leading-[22px] text-neutral-900 dark:text-neutral-50'
            }
          >
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
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();

  const query = useMessages(conversationId);
  const conversations = useConversations();
  const markRead = useMarkConversationRead();
  const { sendMessage, setActiveConversationId } = useMessaging();
  const sendImage = useSendDmImage(conversationId);
  const [draft, setDraft] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const otherParticipant = conversations.data?.pages
    .flatMap((page) => page.content)
    .find((c) => c.id === conversationId)?.otherParticipant;

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
  const insets = useSafeAreaInsets();
  const bubbleImageWidth = Math.min(screenWidth * 0.66, 280);
  // While the keyboard is closed the composer still needs to clear the system
  // nav bar under edge-to-edge; once it's open, keyboardHeight already does that.
  const composerBottomPadding = keyboardHeight > 0 ? 8 : insets.bottom + 8;

  return (
    <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
      <View className="flex-1 bg-white dark:bg-neutral-950">
      <Stack.Screen
        options={{
          headerShown: true,
          title: params.name ?? 'Sohbet',
          headerTitle: () => (
            <Pressable
              className="flex-row items-center gap-2.5 active:opacity-70"
              onPress={() => {
                if (otherParticipant) router.push(`/user/${otherParticipant.username}`);
              }}
            >
              {otherParticipant?.profileImageUrl ? (
                <Image
                  source={{ uri: otherParticipant.profileImageUrl }}
                  style={{ width: 34, height: 34, borderRadius: 17 }}
                  contentFit="cover"
                />
              ) : (
                <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-neutral-300 dark:bg-neutral-700">
                  <Text className="text-xs font-sans-bold text-neutral-700 dark:text-neutral-200">
                    {(otherParticipant?.username ?? params.name ?? '?').substring(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
              <View>
                <Text className="text-[15px] font-sans-bold leading-tight text-neutral-900 dark:text-neutral-50">
                  {otherParticipant?.displayName || otherParticipant?.username || params.name || 'Sohbet'}
                </Text>
                {otherParticipant && (
                  <Text className="text-xs text-neutral-500">@{otherParticipant.username}</Text>
                )}
              </View>
            </Pressable>
          ),
        }}
      />

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
            <MessageBubble
              message={item}
              mine={item.sender.id === account?.id}
              imageWidth={bubbleImageWidth}
              onImagePress={setViewerUri}
            />
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

      <Modal
        visible={!!viewerUri}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setViewerUri(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/95">
          <Pressable className="absolute inset-0" onPress={() => setViewerUri(null)} />
          {viewerUri && (
            <Image
              source={{ uri: viewerUri }}
              style={{ width: '100%', height: '80%' }}
              contentFit="contain"
            />
          )}
          <Pressable
            className="absolute right-4 top-14 h-10 w-10 items-center justify-center rounded-full bg-white/10 active:bg-white/25"
            onPress={() => setViewerUri(null)}
          >
            <X size={22} color="#ffffff" />
          </Pressable>
        </View>
      </Modal>

      <View
        className="border-t border-neutral-100 px-3 pt-2 dark:border-neutral-800"
        style={{ paddingBottom: composerBottomPadding }}
      >
        {imageUri && (
          <View className="flex-row pb-2 pt-1">
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
        <View className="flex-row items-end rounded-2xl border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-900">
          <Pressable
            className="mb-0.5 ml-0.5 h-10 w-10 items-center justify-center rounded-xl active:bg-neutral-200 dark:active:bg-neutral-800"
            onPress={pickImage}
            disabled={sendImage.isPending || !!imageUri}
          >
            <ImagePlus size={22} color={imageUri ? '#a3a3a3' : '#208AEF'} />
          </Pressable>
          <TextInput
            className="flex-1 px-3 text-[16px] text-neutral-900 dark:text-neutral-50"
            style={{ minHeight: 44, maxHeight: 132, paddingTop: 11, paddingBottom: 11 }}
            placeholder="Yeni mesaj..."
            placeholderTextColor="#737373"
            multiline
            value={draft}
            onChangeText={setDraft}
          />
          <Pressable
            className={
              canSend
                ? 'mb-0.5 mr-0.5 h-10 w-10 items-center justify-center rounded-xl bg-primary active:opacity-80'
                : 'mb-0.5 mr-0.5 h-10 w-10 items-center justify-center rounded-xl bg-primary/40'
            }
            onPress={handleSend}
            disabled={!canSend}
          >
            {sendImage.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Send size={18} color="#ffffff" />
            )}
          </Pressable>
        </View>
      </View>
      </View>
    </View>
  );
}
