import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFeed } from './hooks/use-feed';
import { useExploreFeed } from './hooks/use-explore-feed';
import { PostCard } from './components/PostCard';
import { CreatePost } from './components/CreatePost';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { useWebSocket } from '@/hooks/use-websocket';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import type { PostResponse, PageResponse } from '@/types/api';
import type { InfiniteData } from '@tanstack/react-query';

interface FeedTabContentProps {
  data: InfiniteData<PageResponse<PostResponse>>;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  emptyMessage: string;
}

function FeedTabContent({
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  emptyMessage,
}: FeedTabContentProps) {
  const { targetRef, isIntersecting } = useIntersectionObserver({ threshold: 0.5 });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <>
      <div className="flex flex-col">
        {data.pages.map((page) =>
          page.content.map((post) => (
            <PostCard key={post.id} post={post} />
          ))
        )}
      </div>

      <div ref={targetRef} className="flex h-16 items-center justify-center mt-4">
        {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        {!hasNextPage && data.pages[0] !== undefined && data.pages[0].content.length > 0 && (
          <span className="text-sm text-muted-foreground">Tüm gönderileri gördün.</span>
        )}
        {!hasNextPage && data.pages[0] !== undefined && data.pages[0].content.length === 0 && (
          <span className="text-sm text-muted-foreground">{emptyMessage}</span>
        )}
      </div>
    </>
  );
}

interface FeedPageProps {
  defaultTab?: 'following' | 'explore';
}

export function FeedPage({ defaultTab = 'following' }: FeedPageProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  const following = useFeed();
  const explore = useExploreFeed();

  const { subscribe } = useWebSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    const subscription = subscribe('/topic/feed', (message) => {
      const newPost: PostResponse = JSON.parse(message.body);

      queryClient.setQueryData<{ pages: PageResponse<PostResponse>[] }>(['feed'], (old) => {
        if (!old) return old;

        const exists = old.pages.some(page => page.content.some(p => p.id === newPost.id));
        if (exists) return old;

        const newPages = [...old.pages];
        if (newPages[0] !== undefined) {
          newPages[0] = {
            ...newPages[0],
            content: [newPost, ...newPages[0].content],
          };
        }
        return { ...old, pages: newPages };
      });
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [subscribe, queryClient]);

  const renderTabBody = (
    query: typeof following | typeof explore,
    emptyMessage: string
  ) => {
    if (query.status === 'pending') {
      return (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (query.status === 'error') {
      return (
        <div className="p-4 text-center text-sm text-destructive">
          Akış yüklenirken bir hata oluştu. Lütfen tekrar deneyin.
        </div>
      );
    }

    return (
      <FeedTabContent
        data={query.data}
        fetchNextPage={query.fetchNextPage}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        emptyMessage={emptyMessage}
      />
    );
  };

  return (
    <div className="flex flex-col gap-0 pb-4">
      <div className="px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <h2 className="text-xl font-bold">Akış</h2>
      </div>

      <CreatePost />

      <Tabs
        defaultValue={activeTab}
        onValueChange={(value) => setActiveTab(value as string)}
        className="w-full"
      >
        <TabsList variant="line" className="w-full border-b rounded-none px-4">
          <TabsTrigger value="following" className="flex-1">
            Takip Edilen
          </TabsTrigger>
          <TabsTrigger value="explore" className="flex-1">
            Keşfet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="following">
          {renderTabBody(following, 'Henüz hiç gönderi yok. Birilerini takip etmeye başla!')}
        </TabsContent>

        <TabsContent value="explore">
          {renderTabBody(explore, 'Henüz hiç gönderi yok.')}
        </TabsContent>
      </Tabs>
    </div>
  );
}
