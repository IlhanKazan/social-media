import { Link } from 'react-router-dom';
import { Loader2, BadgeCheck } from 'lucide-react';
import { useSuggestions } from '../hooks/use-suggestions';
import { useFollowUser } from '../hooks/use-follow-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PublicAccountResponse } from '@/types/api';

interface Props {
  layout?: 'vertical' | 'horizontal';
  className?: string;
}

export function SuggestedUsers({ layout = 'vertical', className }: Props) {
  const { data: suggestions, isLoading, isError } = useSuggestions(10);

  if (isLoading) {
    return (
      <div className={cn("p-4 flex justify-center", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !suggestions || suggestions.length === 0) {
    return null;
  }

  if (layout === 'horizontal') {
    return (
      <div className={cn("w-full py-4 border-b border-zinc-100 dark:border-zinc-800/50", className)}>
        <h3 className="mb-3 px-4 font-bold text-lg">Kimi Takip Etmeli</h3>
        <div className="flex w-full gap-3 overflow-x-auto pb-2 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
          <div className="w-1 shrink-0 snap-start" />
            {suggestions.map((user) => (
            <SuggestedUserCard key={user.id} user={user} />
            ))}
          <div className="w-1 shrink-0 snap-end" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800/50 dark:bg-zinc-900/30", className)}>
      <h3 className="mb-4 font-bold text-[17px]">Kimi Takip Etmeli</h3>
      <div className="flex flex-col gap-4">
        {suggestions.map((user) => (
          <SuggestedUserItem key={user.id} user={user} />
        ))}
      </div>
    </div>
  );
}


function SuggestedUserItem({ user }: { user: PublicAccountResponse }) {
  const followMutation = useFollowUser(user.username, user.id);

  return (
    <div className="flex items-center justify-between gap-2">
      <Link to={`/u/${user.username}`} className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity outline-none">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={user.profileImageUrl || undefined} />
          <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-[14px] truncate">{user.displayName || user.username}</span>
            {user.emailVerified && <BadgeCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
          </div>
          <span className="text-xs text-muted-foreground truncate">@{user.username}</span>
        </div>
      </Link>

      <Button
        variant={user.isFollowing ? "outline" : "default"}
        size="sm"
        className="rounded-full h-8 px-3 text-xs font-bold shrink-0"
        onClick={() => followMutation.mutate(user.isFollowing)}
        disabled={followMutation.isPending}
      >
        {user.isFollowing ? 'Ediliyor' : 'Takip Et'}
      </Button>
    </div>
  );
}

function SuggestedUserCard({ user }: { user: PublicAccountResponse }) {
  const followMutation = useFollowUser(user.username, user.id);

  return (
    <div className="flex w-[140px] shrink-0 snap-start flex-col items-center justify-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 text-center dark:border-zinc-800/50 dark:bg-zinc-900/30 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
      <Link to={`/u/${user.username}`} className="flex flex-col items-center gap-2 outline-none">
        <Avatar className="h-14 w-14">
          <AvatarImage src={user.profileImageUrl || undefined} />
          <AvatarFallback className="text-lg">{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col w-full px-1">
          <div className="flex items-center justify-center gap-1">
            <span className="font-bold text-[15px] truncate max-w-[100px]">{user.displayName || user.username}</span>
            {user.emailVerified && <BadgeCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
          </div>
          <span className="text-xs text-muted-foreground truncate max-w-[110px]">@{user.username}</span>
        </div>
      </Link>

      <Button
        variant={user.isFollowing ? "outline" : "default"}
        size="sm"
        className="w-full rounded-full h-8 text-xs font-bold mt-auto"
        onClick={() => followMutation.mutate(user.isFollowing)}
        disabled={followMutation.isPending}
      >
        {user.isFollowing ? 'Ediliyor' : 'Takip Et'}
      </Button>
    </div>
  );
}
