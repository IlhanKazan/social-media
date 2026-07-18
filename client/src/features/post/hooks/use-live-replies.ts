import { useEffect } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/use-websocket';
import type { PageResponse, PostResponse } from '@/types/api';

export function useLiveReplies(postId: number) {
  const { isConnected, subscribe } = useWebSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isConnected || !postId) return;

    const subscription = subscribe(`/topic/post/${postId}`, (message) => {
      const reply: PostResponse = JSON.parse(message.body);

      const current = queryClient.getQueryData<InfiniteData<PageResponse<PostResponse>>>([
        'post',
        postId,
        'replies',
      ]);
      if (!current || current.pages.length === 0) return;
      if (current.pages.some((page) => page.content.some((p) => p.id === reply.id))) return;

      const [first, ...rest] = current.pages;
      if (!first) return;

      queryClient.setQueryData(['post', postId, 'replies'], {
        ...current,
        pages: [{ ...first, content: [reply, ...first.content] }, ...rest],
      });

      queryClient.setQueryData<PostResponse>(['post', postId], (old) =>
        old ? { ...old, replyCount: old.replyCount + 1 } : old
      );
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [isConnected, postId, subscribe, queryClient]);
}
