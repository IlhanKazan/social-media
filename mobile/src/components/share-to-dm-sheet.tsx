import { Image } from 'expo-image';
import { Send, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useConversations, useSharePostToDm } from '@/features/messaging/queries';
import type { ConversationResponse } from '@/types/api';

interface Props {
  visible: boolean;
  onClose: () => void;
  postId: number;
}

function ConversationOption({
  conversation,
  disabled,
  onPress,
}: {
  conversation: ConversationResponse;
  disabled: boolean;
  onPress: () => void;
}) {
  const other = conversation.otherParticipant;
  return (
    <Pressable
      className="flex-row items-center gap-3 px-4 py-3 active:bg-neutral-50 dark:active:bg-neutral-900"
      onPress={onPress}
      disabled={disabled}
    >
      {other.profileImageUrl ? (
        <Image source={{ uri: other.profileImageUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
      ) : (
        <View className="h-11 w-11 items-center justify-center rounded-full bg-neutral-300 dark:bg-neutral-700">
          <Text className="font-sans-bold text-neutral-700 dark:text-neutral-200">
            {other.username.substring(0, 2).toUpperCase()}
          </Text>
        </View>
      )}
      <View className="flex-1">
        <Text className="font-sans-semibold text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
          {other.displayName || other.username}
        </Text>
        <Text className="text-sm text-neutral-500" numberOfLines={1}>
          @{other.username}
        </Text>
      </View>
      <Send size={16} color="#71767b" />
    </Pressable>
  );
}

export function ShareToDmSheet({ visible, onClose, postId }: Props) {
  const insets = useSafeAreaInsets();
  const conversations = useConversations();
  const share = useSharePostToDm();
  const [caption, setCaption] = useState('');

  const items = conversations.data?.pages.flatMap((page) => page.content) ?? [];

  const handlePick = (conversationId: number) => {
    share.mutate(
      { conversationId, postId, caption: caption.trim() || undefined },
      {
        onSuccess: () => {
          setCaption('');
          onClose();
        },
        onError: () => Alert.alert('Gönderilemedi', 'Gönderi paylaşılamadı.'),
      }
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/50" onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <View
            className="max-h-[75%] rounded-t-3xl bg-white dark:bg-neutral-900"
            style={{ paddingBottom: insets.bottom + 12 }}
          >
            <View className="flex-row items-center justify-between border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
              <Text className="text-[16px] font-sans-bold text-neutral-900 dark:text-neutral-50">
                Mesajla Paylaş
              </Text>
              <Pressable hitSlop={10} onPress={onClose}>
                <X size={20} color="#71767b" />
              </Pressable>
            </View>

            <View className="border-b border-neutral-100 px-4 py-2 dark:border-neutral-800">
              <TextInput
                className="text-[15px] text-neutral-900 dark:text-neutral-50"
                placeholder="Bir not ekle (opsiyonel)"
                placeholderTextColor="#737373"
                value={caption}
                onChangeText={setCaption}
                maxLength={280}
                editable={!share.isPending}
              />
            </View>

            {conversations.status === 'pending' ? (
              <View className="items-center py-8">
                <ActivityIndicator />
              </View>
            ) : (
              <FlatList
                data={items}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <ConversationOption
                    conversation={item}
                    disabled={share.isPending}
                    onPress={() => handlePick(item.id)}
                  />
                )}
                ListEmptyComponent={
                  <Text className="px-4 py-8 text-center text-neutral-500">Henüz sohbet yok.</Text>
                }
              />
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
