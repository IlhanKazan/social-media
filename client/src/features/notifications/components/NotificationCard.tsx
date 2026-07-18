import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Heart, UserPlus, AtSign, CornerDownRight, Bell, Repeat2, Quote, ShieldAlert, Trash2 } from 'lucide-react';
import type { NotificationResponse } from '@/types/api';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {useDeleteNotification, useMarkAsRead} from '../hooks/use-notifications';
import { useNotificationStore } from '@/stores/notification-store';
import { useNavigate } from 'react-router-dom';

interface Props {
  readonly notification: NotificationResponse;
}

export function NotificationCard({ notification }: Props) {
  const markAsRead = useMarkAsRead();
  const decrementUnread = useNotificationStore((state) => state.decrementUnread);
  const navigate = useNavigate();
  const deleteMut = useDeleteNotification();

  const handleClick = () => {
    if (notification.readAt === null) {
      markAsRead.mutate(notification.id);
      decrementUnread();
    }

    if (notification.type === 'FOLLOW' && notification.actor) {
      navigate(`/u/${notification.actor.username}`);
    } else if (
      ['REPLY', 'MENTION', 'LIKE', 'REPOST', 'QUOTE_REPOST', 'MODERATION_ALERT'].includes(notification.type)
    ) {
      if (notification.referenceId) {
        navigate(`/post/${notification.referenceId}`);
      }
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'LIKE': return <Heart className="h-6 w-6 text-red-500 fill-red-500" />;
      case 'REPLY': return <CornerDownRight className="h-6 w-6 text-indigo-500" />;
      case 'MENTION': return <AtSign className="h-6 w-6 text-yellow-500" />;
      case 'FOLLOW': return <UserPlus className="h-6 w-6 text-primary fill-primary" />;
      case 'REPOST': return <Repeat2 className="h-6 w-6 text-green-500" />;
      case 'QUOTE_REPOST': return <Quote className="h-6 w-6 text-green-500 fill-green-500/20" />;
      case 'MODERATION_ALERT': return <ShieldAlert className="h-6 w-6 text-destructive" />;
      default: return <Bell className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getMessage = () => {
    switch (notification.type) {
      case 'LIKE': return 'gönderini beğendi.';
      case 'REPLY': return 'sana bir yanıt verdi.';
      case 'MENTION': return 'senden bahsetti.';
      case 'FOLLOW': return 'seni takip etmeye başladı.';
      case 'REPOST': return 'gönderini yeniden paylaştı.';
      case 'QUOTE_REPOST': return 'gönderini alıntıladı.';
      case 'MODERATION_ALERT': return 'Gönderin topluluk kuralları ihlali sebebiyle gizlendi.';
      default: return 'yeni bir bildirim gönderdi.';
    }
  };

  const isSystemNotification = notification.type === 'MODERATION_ALERT' || !notification.actor;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        "flex w-full cursor-pointer text-left gap-3 border-b border-zinc-100 dark:border-zinc-800/50 p-4 transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 outline-none",
        notification.readAt === null && "bg-primary/5 dark:bg-primary/10"
      )}
    >
      <div className="flex shrink-0 items-start justify-end w-8 pt-1">
        {getIcon()}
      </div>
      <div className="flex flex-col w-full min-w-0 relative group">
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteMut.mutate(notification.id);
          }}
          className="absolute top-3 right-4 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:text-destructive transition-opacity text-muted-foreground"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        {isSystemNotification ? (
          <Avatar className="h-8 w-8 mb-2">
            <AvatarFallback className="bg-destructive/10 text-destructive border border-destructive/20">
              <ShieldAlert className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <Avatar className="h-8 w-8 mb-2">
            <AvatarImage src={notification.actor?.profileImageUrl || undefined} />
            <AvatarFallback>{notification.actor?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        )}

        <div className="text-[15px] leading-snug">
          {isSystemNotification ? (
            <span className="font-bold mr-1 text-destructive">Sistem Bildirimi</span>
          ) : (
            <span className="font-bold mr-1">
              {notification.actor?.displayName || notification.actor?.username}
              {notification.count > 1 && (
                <span className="font-normal text-muted-foreground"> ve {notification.count - 1} kişi daha</span>
              )}
            </span>
          )}

          <span className={isSystemNotification ? "text-muted-foreground block mt-0.5" : ""}>
             {getMessage()}
          </span>
        </div>

        <span className="text-sm text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.updatedAt), { addSuffix: true, locale: tr })}
        </span>
      </div>
    </div>
  );
}
