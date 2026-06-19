import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useFeed } from './hooks/use-feed';
import { useExploreFeed } from './hooks/use-explore-feed';
import { PostCard } from './components/PostCard';
import { CreatePost } from './components/CreatePost';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { useWebSocket } from '@/hooks/use-websocket';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2, MessageSquareOff, AlertCircle, Plus } from 'lucide-react';
import { PostSkeleton } from '@/components/shared/PostSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import type { PostResponse, PageResponse } from '@/types/api';
import type { InfiniteData } from '@tanstack/react-query';

interface FeedTabContentProps {
  readonly data: InfiniteData<PageResponse<PostResponse>>;
  readonly fetchNextPage: () => void;
  readonly hasNextPage: boolean;
  readonly isFetchingNextPage: boolean;
  readonly emptyMessage: string;
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
      void fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const isEmpty = !hasNextPage && data.pages[0]?.content.length === 0;

  if (isEmpty) {
    return (
      <EmptyState
        icon={<MessageSquareOff className="h-12 w-12" />}
        title="Burası çok sessiz"
        description={emptyMessage}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col">
        {data.pages.map((page) =>
          page.content.map((item: any, index: number) => {
            const isFeedItem = 'post' in item && 'type' in item;
            const actualPost = isFeedItem ? item.post : item;
            const feedType = isFeedItem ? item.type : 'POST';
            const reposter = isFeedItem ? item.reposter : undefined;

            const uniqueKey = isFeedItem
              ? `${item.type}-${actualPost.id}-${reposter?.id || 'none'}-${index}`
              : actualPost.id;

            return (
              <PostCard
                key={uniqueKey}
                post={actualPost}
                feedType={feedType}
                reposter={reposter}
              />
            );
          })
        )}
      </div>

      <div ref={targetRef} className="flex h-16 items-center justify-center mt-4">
        {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        {!hasNextPage && (data.pages[0]?.content.length ?? 0) > 0 && (
          <span className="text-sm text-muted-foreground">Tüm gönderileri gördün.</span>
        )}
      </div>
    </>
  );
}

interface FeedPageProps {
  readonly defaultTab?: 'following' | 'explore';
}

export function FeedPage({ defaultTab = 'following' }: FeedPageProps) {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const account = useAuthStore((state) => state.account);

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
        <div className="flex flex-col">
          {[1, 2, 3, 4, 5].map((i) => <PostSkeleton key={i} />)}
        </div>
      );
    }

    if (query.status === 'error') {
      return (
        <EmptyState
          icon={<AlertCircle className="h-12 w-12 text-destructive" />}
          title="Bir hata oluştu"
          description="Akış yüklenirken bir sorunla karşılaştık. Lütfen sayfayı yenileyin."
          actionLabel="Tekrar Dene"
          onAction={() => query.refetch()}
        />
      );
    }

    if (!query.data) return null;

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
    <div className="flex flex-col gap-0 pb-4 relative">
      <div className="px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <h2 className="text-xl font-bold">{account ? 'Akış' : 'Keşfet'}</h2>
      </div>

      {account && (
        <div className="hidden md:block">
          <CreatePost />
        </div>
      )}

      {account && (
      <div className="md:hidden fixed bottom-[4.5rem] right-4 z-40">
        <Sheet open={isComposerOpen} onOpenChange={setIsComposerOpen}>
          <SheetTrigger render={
            <Button size="icon" className="h-[3.25rem] w-[3.25rem] rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="h-6 w-6" />
            </Button>
          } />
          <SheetContent side="bottom" className="h-[85dvh] p-0 flex flex-col rounded-t-2xl sm:max-w-none w-full border-t border-zinc-200 dark:border-zinc-800" showCloseButton={true}>
            <SheetHeader className="p-4 border-b text-left shrink-0">
              <SheetTitle>Gönderi Oluştur</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto bg-background">
              <CreatePost onSuccessCallback={() => setIsComposerOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
      )}

      {account ? (
        <Tabs
          value={activeTab}
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

          <TabsContent value="following" className="outline-none m-0">
            {renderTabBody(following, 'Henüz hiç gönderi yok. Birilerini takip etmeye başla!')}
          </TabsContent>

          <TabsContent value="explore" className="outline-none m-0">
            {renderTabBody(explore, 'Henüz hiç gönderi yok.')}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="outline-none m-0">
          {renderTabBody(explore, 'Henüz hiç gönderi yok.')}
        </div>
      )}
    </div>
  );
}
