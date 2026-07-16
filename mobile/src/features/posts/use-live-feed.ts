import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useWebSocket } from '@/lib/ws';
import type { FeedItemResponse, PageResponse, PostResponse } from '@/types/api';

type FeedPages = InfiniteData<PageResponse<FeedItemResponse | PostResponse>>;

interface PostRemovedPayload {
  type: 'POST_REMOVED';
  postId: number;
}

const containsPost = (pages: FeedPages['pages'], postId: number) =>
  pages.some((page) =>
    page.content.some((item) => ('post' in item ? item.post.id === postId : item.id === postId))
  );

export function useLiveFeed() {
  const { isConnected, subscribe } = useWebSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isConnected) return;

    const subscription = subscribe('/topic/feed', (message) => {
      const payload = JSON.parse(message.body) as PostResponse | PostRemovedPayload;

      if ('type' in payload && payload.type === 'POST_REMOVED') {
        for (const key of [['feed'], ['explore']]) {
          queryClient.setQueryData<FeedPages>(key, (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                content: page.content.filter((item) =>
                  'post' in item ? item.post.id !== payload.postId : item.id !== payload.postId
                ),
              })),
            };
          });
        }
        return;
      }

      const post = payload as PostResponse;
      queryClient.setQueryData<FeedPages>(['feed'], (old) => {
        if (!old || old.pages.length === 0) return old;
        if (containsPost(old.pages, post.id)) return old;
        const [first, ...rest] = old.pages;
        if (!first) return old;
        return { ...old, pages: [{ ...first, content: [post, ...first.content] }, ...rest] };
      });
    });

    return () => subscription?.unsubscribe();
  }, [isConnected, subscribe, queryClient]);
}
