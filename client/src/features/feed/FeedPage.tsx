import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFeed } from './hooks/use-feed';
import { PostCard } from './components/PostCard';
import { CreatePost } from './components/CreatePost';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { useWebSocket } from '@/hooks/use-websocket';
import { Loader2 } from 'lucide-react';
import type { PostResponse, PageResponse } from '@/types/api';

export function FeedPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useFeed();
  const { targetRef, isIntersecting } = useIntersectionObserver({ threshold: 0.5 });
  const { subscribe } = useWebSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const subscription = subscribe('/topic/feed', (message) => {
      const newPost: PostResponse = JSON.parse(message.body);

      queryClient.setQueryData<{ pages: PageResponse<PostResponse>[] }>(['feed'], (old) => {
        if (!old) return old;

        const exists = old.pages.some(page => page.content.some(p => p.id === newPost.id));
        if (exists) return old;

        const newPages = [...old.pages];
        newPages[0] = {
          ...newPages[0],
          content: [newPost, ...newPages[0].content]
        };
        return { ...old, pages: newPages };
      });
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [subscribe, queryClient]);

  if (status === 'pending') {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-4 text-center text-sm text-destructive">
        Akış yüklenirken bir hata oluştu. Lütfen tekrar deneyin.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 pb-4">
      <div className="px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <h2 className="text-xl font-bold">Akış</h2>
      </div>

      <CreatePost />

      <div className="flex flex-col gap-0 sm:gap-4 px-0 sm:px-4 sm:pt-4">
        {data.pages.map((page) =>
          page.content.map((post) => (
            <PostCard key={post.id} post={post} />
          ))
        )}
      </div>

      <div ref={targetRef} className="flex h-16 items-center justify-center mt-4">
        {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        {!hasNextPage && data.pages[0].content.length > 0 && (
          <span className="text-sm text-muted-foreground">Tüm gönderileri gördün.</span>
        )}
        {!hasNextPage && data.pages[0].content.length === 0 && (
          <span className="text-sm text-muted-foreground">Henüz hiç gönderi yok. Birilerini takip etmeye başla!</span>
        )}
      </div>
    </div>
  );
}
