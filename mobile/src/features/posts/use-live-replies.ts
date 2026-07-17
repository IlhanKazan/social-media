import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useWebSocket } from '@/lib/ws';
import type { PageResponse, PostResponse } from '@/types/api';

type ReplyPages = InfiniteData<PageResponse<PostResponse>>;

export function useLiveReplies(postId: number) {
  const { isConnected, subscribe } = useWebSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isConnected || !Number.isFinite(postId)) return;

    const subscription = subscribe(`/topic/post/${postId}`, (message) => {
      const reply = JSON.parse(message.body) as PostResponse;

      const current = queryClient.getQueryData<ReplyPages>(['post', postId, 'replies']);
      if (!current || current.pages.length === 0) return;
      if (current.pages.some((page) => page.content.some((p) => p.id === reply.id))) return;

      const [first, ...rest] = current.pages;
      if (!first) return;

      queryClient.setQueryData<ReplyPages>(['post', postId, 'replies'], {
        ...current,
        pages: [{ ...first, content: [reply, ...first.content] }, ...rest],
      });

      queryClient.setQueryData<PostResponse>(['post', postId], (old) =>
        old ? { ...old, replyCount: old.replyCount + 1 } : old
      );
    });

    return () => subscription?.unsubscribe();
  }, [isConnected, postId, subscribe, queryClient]);
}
