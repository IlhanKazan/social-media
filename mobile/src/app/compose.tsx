import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image as ImageIcon, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MentionSuggestions } from '@/components/mention-suggestions';
import { uploadPostImage, useCreatePost, useQuoteRepost, useUpdatePost } from '@/features/posts/queries';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { getActiveMentionQuery, insertMention } from '@/features/mentions/mention-utils';
import type { ErrorResponse } from '@/types/api';

const MAX_CONTENT_LENGTH = 500;

export default function ComposeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    parentPostId?: string;
    parentAuthor?: string;
    quotePostId?: string;
    quoteAuthor?: string;
    quoteContent?: string;
    editPostId?: string;
    initialContent?: string;
    editImageUrl?: string;
  }>();
  const parentPostId = params.parentPostId ? Number(params.parentPostId) : undefined;
  const quotePostId = params.quotePostId ? Number(params.quotePostId) : undefined;
  const editPostId = params.editPostId ? Number(params.editPostId) : undefined;

  const [content, setContent] = useState(params.initialContent ?? '');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);

  const activeMentionQuery = getActiveMentionQuery(content, cursorPos);
  const handleMentionSelect = (username: string) => {
    const { text, cursor } = insertMention(content, cursorPos, username);
    setContent(text);
    setCursorPos(cursor);
  };

  const createPost = useCreatePost();
  const quoteRepost = useQuoteRepost();
  const updatePost = useUpdatePost();
  const busy = uploading || createPost.isPending || quoteRepost.isPending || updatePost.isPending;
  const canSubmit = content.trim().length > 0 && content.length <= MAX_CONTENT_LENGTH && !busy;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Alert.alert('Image too large', 'The image must be smaller than 5MB.');
      return;
    }
    setImageUri(asset.uri);
  };

  const submit = async () => {
    let imageUrl: string | undefined;
    if (imageUri) {
      setUploading(true);
      try {
        imageUrl = await uploadPostImage(imageUri);
      } catch {
        Alert.alert('Upload failed', 'Only JPG, PNG, WEBP or GIF up to 5MB is allowed.');
        return;
      } finally {
        setUploading(false);
      }
    }

    const callbacks = {
      onSuccess: () => router.back(),
      onError: (error: unknown) => {
        const data = (error as { response?: { data?: ErrorResponse } }).response?.data;
        Alert.alert('Post failed', data?.message ?? 'Something went wrong. Please try again.');
      },
    };

    if (editPostId) {
      updatePost.mutate(
        { postId: editPostId, request: { content: content.trim(), imageUrl: params.editImageUrl } },
        callbacks
      );
    } else if (quotePostId) {
      quoteRepost.mutate({ content: content.trim(), imageUrl, quotedPostId: quotePostId }, callbacks);
    } else {
      createPost.mutate({ content: content.trim(), imageUrl, parentPostId }, callbacks);
    }
  };

  const keyboardHeight = useKeyboardHeight();

  return (
    <View style={{ flex: 1, paddingBottom: keyboardHeight }}>
      <View className="flex-1 bg-white dark:bg-neutral-950">
      <Stack.Screen
        options={{
          title: editPostId
            ? 'Gönderiyi Düzenle'
            : quotePostId
              ? 'Alıntıla'
              : parentPostId
                ? 'Yanıtla'
                : 'Yeni gönderi',
          presentation: 'modal',
          headerShown: true,
        }}
      />

      <View className="flex-1 p-4">
        {parentPostId && params.parentAuthor && (
          <Text className="mb-2 text-sm text-neutral-500">@{params.parentAuthor} kullanıcısına yanıt</Text>
        )}

        <TextInput
          className="min-h-[120px] text-[17px] text-neutral-900 dark:text-neutral-50"
          placeholder={
            quotePostId ? 'Düşüncelerini ekle...' : parentPostId ? 'Yanıtını gönder' : 'Neler oluyor?'
          }
          placeholderTextColor="#737373"
          multiline
          autoFocus
          maxLength={MAX_CONTENT_LENGTH}
          value={content}
          onChangeText={setContent}
          onSelectionChange={(e) => setCursorPos(e.nativeEvent.selection.start)}
          textAlignVertical="top"
        />

        {quotePostId && (
          <View className="mt-2 rounded-2xl border border-neutral-200 p-3 opacity-70 dark:border-neutral-800">
            <Text className="text-sm font-sans-bold text-neutral-900 dark:text-neutral-50">
              {params.quoteAuthor}
            </Text>
            <Text className="mt-0.5 text-sm text-neutral-500" numberOfLines={3}>
              {params.quoteContent}
            </Text>
          </View>
        )}

        {imageUri && (
          <View className="mt-2">
            <Image
              source={{ uri: imageUri }}
              style={{ width: '100%', height: 220, borderRadius: 16 }}
              contentFit="cover"
            />
            <Pressable
              className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/60"
              onPress={() => setImageUri(null)}
              disabled={busy}
            >
              <X size={16} color="#ffffff" />
            </Pressable>
            {uploading && (
              <View className="absolute inset-0 items-center justify-center rounded-2xl bg-black/30">
                <ActivityIndicator size="large" color="#ffffff" />
              </View>
            )}
          </View>
        )}
      </View>

      <View className="flex-row items-center justify-between border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-100 dark:active:bg-neutral-900"
          onPress={pickImage}
          disabled={busy || !!imageUri || !!editPostId}
        >
          <ImageIcon size={22} color={imageUri || editPostId ? '#a3a3a3' : '#208AEF'} />
        </Pressable>

        <View className="flex-row items-center gap-3">
          <Text className="text-sm text-neutral-500">
            {content.length}/{MAX_CONTENT_LENGTH}
          </Text>
          <Pressable
            className={
              canSubmit
                ? 'rounded-full bg-primary px-6 py-2.5 active:opacity-80'
                : 'rounded-full bg-primary/50 px-6 py-2.5'
            }
            onPress={submit}
            disabled={!canSubmit}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="font-sans-bold text-white">
                {editPostId ? 'Kaydet' : parentPostId ? 'Yanıtla' : 'Gönder'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
      </View>

      {activeMentionQuery !== null && (
        // Absolutely positioned so the suggestion strip floats above the keyboard
        // instead of pushing the TextInput/layout around while typing.
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <MentionSuggestions query={activeMentionQuery} onSelect={handleMentionSelect} />
        </View>
      )}
    </View>
  );
}
