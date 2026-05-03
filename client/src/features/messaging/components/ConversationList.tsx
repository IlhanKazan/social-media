import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { useConversations } from '../hooks/use-conversations';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function ConversationList() {
  const { conversationId } = useParams();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useConversations();
  const { targetRef, isIntersecting } = useIntersectionObserver({ threshold: 0.5 });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (status === 'pending') {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'error') {
    return <div className="p-4 text-center text-sm text-destructive">Sohbetler yüklenemedi.</div>;
  }

  const conversations = data.pages.flatMap((page) => page.content);

  if (conversations.length === 0) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Henüz bir mesajın yok.</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto border-r border-zinc-100 dark:border-zinc-800/50">
      {conversations.map((conv) => {
        const isActive = Number(conversationId) === conv.id;
        return (
          <Link
            key={conv.id}
            to={`/messages/${conv.id}`}
            className={cn(
              "flex items-center gap-3 p-4 border-b border-zinc-50 dark:border-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors",
              isActive && "bg-zinc-100 dark:bg-zinc-800/50"
            )}
          >
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={conv.otherParticipant.profileImageUrl || undefined} />
              <AvatarFallback>{conv.otherParticipant.username.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold truncate text-[15px]">
                  {conv.otherParticipant.displayName || conv.otherParticipant.username}
                </span>
                {conv.lastMessageAt && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false, locale: tr })}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className="text-sm text-muted-foreground truncate">
                  @{conv.otherParticipant.username}
                </span>
                {conv.unreadCount > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shrink-0">
                    {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
      <div ref={targetRef} className="flex h-12 shrink-0 items-center justify-center">
        {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}
