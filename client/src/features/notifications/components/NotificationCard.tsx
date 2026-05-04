import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Heart, UserPlus, AtSign, CornerDownRight, Bell } from 'lucide-react';
import type { NotificationResponse } from '@/types/api';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMarkAsRead } from '../hooks/use-notifications';
import { useNotificationStore } from '@/stores/notification-store';
import { useNavigate } from 'react-router-dom';

interface Props {
  readonly notification: NotificationResponse;
}

export function NotificationCard({ notification }: Props) {
  const markAsRead = useMarkAsRead();
  const decrementUnread = useNotificationStore((state) => state.decrementUnread);
  const navigate = useNavigate();

  const handleClick = () => {
    if (notification.readAt === null) {
      markAsRead.mutate(notification.id);
      decrementUnread();
    }

    if (notification.type === 'FOLLOW') {
      navigate(`/u/${notification.actor.username}`);
    } else if (notification.type === 'REPLY' || notification.type === 'MENTION' || notification.type === 'LIKE') {
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
      default: return <Bell className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const getMessage = () => {
    switch (notification.type) {
      case 'LIKE': return 'gönderini beğendi.';
      case 'REPLY': return 'sana bir yanıt verdi.';
      case 'MENTION': return 'senden bahsetti.';
      case 'FOLLOW': return 'seni takip etmeye başladı.';
      default: return 'yeni bir bildirim gönderdi.';
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex w-full text-left gap-3 border-b border-zinc-100 dark:border-zinc-800/50 p-4 transition-colors hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 outline-none",
        notification.readAt === null && "bg-primary/5 dark:bg-primary/10"
      )}
    >
      <div className="flex shrink-0 items-start justify-end w-8 pt-1">
        {getIcon()}
      </div>
      <div className="flex flex-col w-full min-w-0">
        <Avatar className="h-8 w-8 mb-2">
          <AvatarImage src={notification.actor.profileImageUrl || undefined} />
          <AvatarFallback>{notification.actor.username.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="text-[15px] leading-snug">
          <span className="font-bold mr-1">{notification.actor.displayName || notification.actor.username}</span>
          {getMessage()}
        </div>
        <span className="text-sm text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: tr })}
        </span>
      </div>
    </button>
  );
}
