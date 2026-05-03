import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useFollowList } from '../hooks/use-follow-list';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Props {
  accountId: number;
  type: 'followers' | 'following';
  count: number;
  label: string;
}

export function FollowListDialog({ accountId, type, count, label }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useFollowList(accountId, type, isOpen);
  const { targetRef, isIntersecting } = useIntersectionObserver({ threshold: 0.5 });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={
        <button className="flex gap-1 hover:underline outline-none cursor-pointer" />
      }>
        <span className="font-bold text-foreground">{count}</span>
        <span className="text-muted-foreground">{label}</span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[400px] h-[80vh] sm:h-[600px] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle className="text-lg">{label}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {status === 'pending' ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-col">
              {data?.pages.flatMap(p => p.content).map((user) => (
                <Link
                  key={user.id}
                  to={`/u/${user.username}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-4 border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-bold truncate">{user.displayName || user.username}</span>
                    <span className="text-sm text-muted-foreground truncate">@{user.username}</span>
                  </div>
                </Link>
              ))}

              <div ref={targetRef} className="flex h-12 shrink-0 items-center justify-center">
                {isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
