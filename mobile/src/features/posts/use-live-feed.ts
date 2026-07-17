import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useWebSocket } from '@/lib/ws';
import { useAuthStore } from '@/stores/auth-store';
import type { FeedItemResponse, PageResponse, PostResponse } from '@/types/api';

type ExplorePages = InfiniteData<PageResponse<PostResponse>>;

interface PostRemovedPayload {
  type: 'POST_REMOVED';
  postId: number;
}

const containsPost = (pages: ExplorePages['pages'], postId: number) =>
  pages.some((page) => page.content.some((post) => post.id === postId));

function removePost<T extends FeedItemResponse | PostResponse>(pages: PageResponse<T>[], postId: number) {
  return pages.map((page) => ({
    ...page,
    content: page.content.filter((item) => ('post' in item ? item.post.id !== postId : item.id !== postId)),
  }));
}

export function useLiveFeed() {
  const { isConnected, subscribe } = useWebSocket();
  const account = useAuthStore((s) => s.account);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isConnected) return;

    const subscription = subscribe('/topic/feed', (message) => {
      const payload = JSON.parse(message.body) as PostResponse | PostRemovedPayload;

      if ('type' in payload && payload.type === 'POST_REMOVED') {
        queryClient.setQueryData<InfiniteData<PageResponse<FeedItemResponse>>>(['feed'], (old) =>
          old ? { ...old, pages: removePost(old.pages, payload.postId) } : old
        );
        queryClient.setQueryData<ExplorePages>(['explore'], (old) =>
          old ? { ...old, pages: removePost(old.pages, payload.postId) } : old
        );
        return;
      }

      // /topic/feed is a global broadcast of every new top-level post, not
      // scoped to the viewer's follow graph — safe to splice into Explore
      // (a global feed by design) but Following must stay server-filtered,
      // so we only fast-path the viewer's own post and otherwise refetch.
      const post = payload as PostResponse;
      if (post.parentPostId) return;

      queryClient.setQueryData<ExplorePages>(['explore'], (old) => {
        if (!old || old.pages.length === 0) return old;
        if (containsPost(old.pages, post.id)) return old;
        const [first, ...rest] = old.pages;
        if (!first) return old;
        return { ...old, pages: [{ ...first, content: [post, ...first.content] }, ...rest] };
      });

      if (post.author.id === account?.id) {
        queryClient.setQueryData<InfiniteData<PageResponse<FeedItemResponse>>>(['feed'], (old) => {
          if (!old || old.pages.length === 0) return old;
          const alreadyPresent = old.pages.some((page) =>
            page.content.some((item) => item.post.id === post.id)
          );
          if (alreadyPresent) return old;
          const [first, ...rest] = old.pages;
          if (!first) return old;
          const feedItem: FeedItemResponse = { type: 'POST', repostedAt: post.createdAt, post };
          return { ...old, pages: [{ ...first, content: [feedItem, ...first.content] }, ...rest] };
        });
      } else {
        void queryClient.invalidateQueries({ queryKey: ['feed'] });
      }
    });

    return () => subscription?.unsubscribe();
  }, [isConnected, subscribe, queryClient, account?.id]);
}
