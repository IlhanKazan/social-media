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
  Sparkles,
  Trash2,
  UserPlus,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { useDeleteNotification, useMarkAsRead } from '@/features/notifications/queries';
import { useNow } from '@/hooks/use-now';
import { formatShortRelativeTime } from '@/lib/relative-time';
import type { NotificationResponse } from '@/types/api';
import type { TFunction } from 'i18next';

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
      <Text className="text-xs font-sans-bold text-neutral-700 dark:text-neutral-200">
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
    case 'RECOMMENDATION': return <Sparkles {...props} color="#f59e0b" />;
    default: return <Bell {...props} color="#a3a3a3" />;
  }
}

function message(t: TFunction, type: NotificationResponse['type']) {
  switch (type) {
    case 'LIKE': return t('notifications.types.like');
    case 'REPLY': return t('notifications.types.reply');
    case 'MENTION': return t('notifications.types.mention');
    case 'FOLLOW': return t('notifications.types.follow');
    case 'REPOST': return t('notifications.types.repost');
    case 'QUOTE_REPOST': return t('notifications.types.quoteRepost');
    case 'MODERATION_ALERT': return t('notifications.types.moderationAlert');
    case 'RECOMMENDATION': return t('notifications.types.recommendation');
    default: return t('notifications.types.default');
  }
}

export function NotificationCard({ notification }: Props) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const markAsRead = useMarkAsRead();
  const deleteNotification = useDeleteNotification();
  const isSystem = notification.type === 'MODERATION_ALERT' || !notification.actor;
  const now = useNow();

  const handlePress = () => {
    if (notification.readAt === null) {
      markAsRead.mutate(notification.id);
    }
    if (notification.type === 'FOLLOW' && notification.actor) {
      router.push(`/user/${notification.actor.username}`);
    } else if (notification.type !== 'FOLLOW' && notification.referenceId) {
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

        <Text className="text-[16px] leading-[22px] text-neutral-900 dark:text-neutral-50">
          {isSystem ? (
            <Text className="font-sans-bold text-red-500">{t('notifications.systemNotification')} </Text>
          ) : (
            <Text className="font-sans-bold">
              {(notification.actor?.displayName || notification.actor?.username) + ' '}
              {notification.count > 1 && (
                <Text className="font-normal text-neutral-500">{t('notifications.moreCount', { count: notification.count - 1 })} </Text>
              )}
            </Text>
          )}
          <Text className="text-neutral-700 dark:text-neutral-300">{message(t, notification.type)}</Text>
        </Text>

        <Text className="mt-1 text-[13px] text-neutral-500">
          {formatShortRelativeTime(notification.updatedAt ?? notification.createdAt, now, t, i18n.language)}
        </Text>
      </View>
    </Pressable>
  );
}
