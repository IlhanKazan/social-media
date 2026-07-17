import { formatDistanceToNowStrict } from 'date-fns';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  AtSign,
  Bell,
  CornerDownRight,
  Heart,
  Quote,
  Repeat2,
  ShieldAlert,
  Trash2,
  UserPlus,
} from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useDeleteNotification, useMarkAsRead } from '@/features/notifications/queries';
import type { NotificationResponse } from '@/types/api';

interface Props {
  notification: NotificationResponse;
}

function Avatar({ notification }: { notification: NotificationResponse }) {
  const isSystem = !notification.actor;
  if (isSystem) {
    return (
      <View className="h-9 w-9 items-center justify-center rounded-full bg-red-500/10">
        <ShieldAlert size={16} color="#ef4444" />
      </View>
    );
  }
  if (notification.actor?.profileImageUrl) {
    return (
      <Image
        source={{ uri: notification.actor.profileImageUrl }}
        style={{ width: 36, height: 36, borderRadius: 18 }}
      />
    );
  }
  return (
    <View className="h-9 w-9 items-center justify-center rounded-full bg-neutral-300 dark:bg-neutral-700">
      <Text className="text-xs font-bold text-neutral-700 dark:text-neutral-200">
        {notification.actor?.username.substring(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

function icon(type: NotificationResponse['type']) {
  const props = { size: 22 };
  switch (type) {
    case 'LIKE': return <Heart {...props} color="#ef4444" fill="#ef4444" />;
    case 'REPLY': return <CornerDownRight {...props} color="#6366f1" />;
    case 'MENTION': return <AtSign {...props} color="#eab308" />;
    case 'FOLLOW': return <UserPlus {...props} color="#208AEF" fill="#208AEF" />;
    case 'REPOST': return <Repeat2 {...props} color="#22c55e" />;
    case 'QUOTE_REPOST': return <Quote {...props} color="#22c55e" />;
    case 'MODERATION_ALERT': return <ShieldAlert {...props} color="#ef4444" />;
    default: return <Bell {...props} color="#a3a3a3" />;
  }
}

function message(type: NotificationResponse['type']) {
  switch (type) {
    case 'LIKE': return 'gönderini beğendi.';
    case 'REPLY': return 'sana bir yanıt verdi.';
    case 'MENTION': return 'senden bahsetti.';
    case 'FOLLOW': return 'seni takip etmeye başladı.';
    case 'REPOST': return 'gönderini yeniden paylaştı.';
    case 'QUOTE_REPOST': return 'gönderini alıntıladı.';
    case 'MODERATION_ALERT': return 'Gönderin topluluk kuralları ihlali sebebiyle gizlendi.';
    default: return 'yeni bir bildirim gönderdi.';
  }
}

export function NotificationCard({ notification }: Props) {
  const router = useRouter();
  const markAsRead = useMarkAsRead();
  const deleteNotification = useDeleteNotification();
  const isSystem = notification.type === 'MODERATION_ALERT' || !notification.actor;

  const handlePress = () => {
    if (notification.readAt === null) {
      markAsRead.mutate(notification.id);
    }
    if (notification.type !== 'FOLLOW' && notification.referenceId) {
      router.push(`/post/${notification.referenceId}`);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      className={`flex-row gap-3 border-b border-neutral-100 p-4 dark:border-neutral-800/50 ${
        notification.readAt === null ? 'bg-primary/5 dark:bg-primary/10' : ''
      }`}
    >
      <View className="w-8 items-end pt-1">{icon(notification.type)}</View>

      <View className="flex-1">
        <View className="mb-2 flex-row items-center justify-between">
          <Avatar notification={notification} />
          <Pressable hitSlop={10} onPress={() => deleteNotification.mutate(notification.id)}>
            <Trash2 size={16} color="#a3a3a3" />
          </Pressable>
        </View>

        <Text className="text-[15px] leading-snug text-neutral-900 dark:text-neutral-50">
          {isSystem ? (
            <Text className="font-bold text-red-500">Sistem Bildirimi </Text>
          ) : (
            <Text className="font-bold">
              {(notification.actor?.displayName || notification.actor?.username) + ' '}
            </Text>
          )}
          <Text className="text-neutral-700 dark:text-neutral-300">{message(notification.type)}</Text>
        </Text>

        <Text className="mt-1 text-sm text-neutral-500">
          {formatDistanceToNowStrict(new Date(notification.createdAt), { addSuffix: true })}
        </Text>
      </View>
    </Pressable>
  );
}
