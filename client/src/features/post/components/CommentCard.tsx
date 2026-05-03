import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Trash2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDeleteComment } from '../hooks/use-comments';
import { useAuthStore } from '@/stores/auth-store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { CommentResponse } from '@/types/api';

interface Props {
  postId: number;
  comment: CommentResponse;
}

export function CommentCard({ postId, comment }: Props) {
  const account = useAuthStore((state) => state.account);
  const deleteMutation = useDeleteComment(postId);

  const isMine = account?.id === comment.author.id;

  return (
    <div className="flex gap-3 p-4 border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
      <Link to={`/u/${comment.author.username}`} className="shrink-0">
        <Avatar>
          <AvatarImage src={comment.author.profileImageUrl || undefined} />
          <AvatarFallback>{comment.author.username.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <Link to={`/u/${comment.author.username}`} className="font-bold hover:underline truncate">
              {comment.author.displayName || comment.author.username}
            </Link>
            <span className="text-muted-foreground text-sm truncate">@{comment.author.username}</span>
            <span className="text-muted-foreground text-sm shrink-0">·</span>
            <span className="text-muted-foreground text-sm shrink-0">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: false, locale: tr })}
            </span>
          </div>
          {isMine && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-2"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(comment.id)}
            >
              {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
        <p className="mt-0.5 text-[15px] whitespace-pre-wrap break-words">{comment.content}</p>
      </div>
    </div>
  );
}
