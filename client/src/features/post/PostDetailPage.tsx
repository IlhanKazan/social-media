import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, MessageSquareOff } from 'lucide-react';
import { usePost, usePostReplies, usePostAncestors } from './hooks/use-post';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { PostCard } from '@/features/feed/components/PostCard';
import { CreatePost } from '@/features/feed/components/CreatePost';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';

export function PostDetailPage() {
  const { id } = useParams();
  const postId = Number(id);
  const navigate = useNavigate();

  const { data: post, status: postStatus } = usePost(postId);
  const { data: ancestors } = usePostAncestors(postId);
  const { data: replies, fetchNextPage, hasNextPage, isFetchingNextPage } = usePostReplies(postId);

  const { targetRef, isIntersecting } = useIntersectionObserver({ threshold: 0.5 });

  const focusedRef = useRef<HTMLDivElement>(null);
  const hasScrolled = useRef(false);
  const ancestorCount = ancestors?.length ?? 0;

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    hasScrolled.current = false;
  }, [postId]);

  useEffect(() => {
    if (hasScrolled.current || ancestorCount === 0 || !focusedRef.current) return;
    hasScrolled.current = true;
    focusedRef.current.scrollIntoView({ block: 'start' });
  }, [ancestorCount, postId]);

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
        <p className="text-muted-foreground font-medium">Gönderi bulunamadı veya silinmiş.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Geri Dön</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <div className="flex items-center gap-6 px-4 py-3 border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-bold">Gönderi</h2>
      </div>

      {ancestors?.map((ancestor, index) => (
        <PostCard
          key={ancestor.id}
          post={ancestor}
          connector={index === 0 ? 'bottom' : 'both'}
        />
      ))}

      <div ref={focusedRef} className="scroll-mt-[57px]">
        <PostCard post={post} connector={ancestorCount > 0 ? 'top' : 'none'} />
      </div>

      <div className="border-t border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/30 dark:bg-zinc-900/10">
        <CreatePost parentPostId={postId} placeholder="Yanıtını gönder..." />
      </div>

      <div className="flex flex-col pb-safe">
        {replies?.pages.flatMap((page) => page.content).map((reply) => (
          <PostCard key={reply.id} post={reply} />
        ))}

        {!hasNextPage && replies?.pages[0]?.content.length === 0 && (
          <EmptyState
            icon={<MessageSquareOff className="h-10 w-10"/>}
            title="Yanıt Yok"
            description="İlk yanıtı sen gönder!"
          />
        )}

        <div ref={targetRef} className="h-16 flex items-center justify-center">
          {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
      </div>
    </div>
  );
}
