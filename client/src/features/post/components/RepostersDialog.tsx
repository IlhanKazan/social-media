import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useReposters } from '../hooks/use-reposters';
import { useFollowUser } from '@/features/profile/hooks/use-follow-user';
import { useAuthStore } from '@/stores/auth-store';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { PublicAccountResponse } from '@/types/api';

interface Props {
  postId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RepostersDialog({ postId, open, onOpenChange }: Props) {
  const currentUser = useAuthStore((state) => state.account);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useReposters(postId, open);
  const { targetRef, isIntersecting } = useIntersectionObserver({ threshold: 0.5 });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] h-[80vh] sm:h-[600px] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 border-b shrink-0">
          <DialogTitle className="text-lg">Yeniden Paylaşanlar</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {status === 'pending' ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-col">
              {data?.pages.flatMap((p) => p.content).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                >
                  <Link
                    to={`/u/${user.username}`}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={user.profileImageUrl || undefined} />
                      <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden min-w-0">
                      <span className="font-bold truncate text-[15px]">{user.displayName || user.username}</span>
                      <span className="text-sm text-muted-foreground truncate">@{user.username}</span>
                    </div>
                  </Link>

                  {currentUser?.id !== user.id && (
                    <div className="shrink-0 ml-3">
                      <FollowButton user={user} />
                    </div>
                  )}
                </div>
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

function FollowButton({ user }: { user: PublicAccountResponse }) {
  const followMutation = useFollowUser(user.username, user.id);

  return (
    <Button
      variant={user.isFollowing ? 'outline' : 'default'}
      size="sm"
      className="rounded-full h-8 px-4 text-xs font-bold w-[110px]"
      onClick={(e) => {
        e.stopPropagation();
        followMutation.mutate(user.isFollowing);
      }}
      disabled={followMutation.isPending}
    >
      {user.isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
    </Button>
  );
}
