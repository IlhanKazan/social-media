import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { usePost } from './hooks/use-post';
import { useComments, useCreateComment } from './hooks/use-comments';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { useAuthStore } from '@/stores/auth-store';
import { PostCard } from '@/features/feed/components/PostCard';
import { CommentCard } from './components/CommentCard';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';

const commentSchema = z.object({
  content: z.string().min(1).max(4000),
});

type CommentInput = z.infer<typeof commentSchema>;

export function PostDetailPage() {
  const { id } = useParams();
  const postId = Number(id);
  const navigate = useNavigate();
  const account = useAuthStore((state) => state.account);

  const { data: post, status: postStatus } = usePost(postId);
  const { data: comments, fetchNextPage, hasNextPage, isFetchingNextPage } = useComments(postId);
  const createMutation = useCreateComment(postId);

  const { targetRef, isIntersecting } = useIntersectionObserver({ threshold: 0.5 });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CommentInput>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: '' }
  });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const onSubmit = (data: CommentInput) => {
    createMutation.mutate(data.content, {
      onSuccess: () => reset(),
    });
  };

  if (postStatus === 'pending') {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (postStatus === 'error' || !post) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground font-medium">Gönderi bulunamadı.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Geri Dön</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex items-center gap-6 px-4 py-3 border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-bold">Gönderi</h2>
      </div>

      <PostCard post={post} />

      <div className="flex gap-3 p-4 border-b border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/30 dark:bg-zinc-900/20">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={account?.profileImageUrl || undefined} />
          <AvatarFallback>{account?.username.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col w-full gap-2">
          <Textarea
            placeholder="Yanıtını gönder..."
            className="min-h-[44px] max-h-48 border-0 shadow-none resize-none bg-transparent p-2 focus-visible:ring-0 text-[15px]"
            aria-invalid={!!errors.content}
            {...register('content')}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              className="rounded-full px-6 font-bold"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yanıtla'}
            </Button>
          </div>
        </form>
      </div>

      <div className="flex flex-col pb-safe">
        {comments?.pages.flatMap((page) => page.content).map((comment) => (
          <CommentCard key={comment.id} postId={postId} comment={comment} />
        ))}

        <div ref={targetRef} className="h-16 flex items-center justify-center">
          {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
      </div>
    </div>
  );
}
