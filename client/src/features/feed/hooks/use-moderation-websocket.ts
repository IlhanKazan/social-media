import { useEffect } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/use-websocket';
import { toast } from 'sonner';
import type { PageResponse } from '@/types/api';

export function useModerationWebSocket() {
  const { subscribe } = useWebSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    const feedSub = subscribe('/topic/feed', (message) => {
      const payload = JSON.parse(message.body);

      if (payload.type === 'POST_REMOVED' && payload.postId) {
        const evictPost = (old: InfiniteData<PageResponse<any>> | undefined) => {
          if (!old || !old.pages) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              content: page.content.filter((item) => {
                const id = ('post' in item) ? item.post.id : item.id;
                return id !== payload.postId;
              })
            }))
          };
        };

        queryClient.setQueryData(['feed'], evictPost);
        queryClient.setQueryData(['explore'], evictPost);
        queryClient.invalidateQueries({ queryKey: ['profile-feed'] });
      }
    });

    const notifSub = subscribe('/user/queue/notifications', (message) => {
      const payload = JSON.parse(message.body);

      if (payload.type === 'MODERATION_ALERT') {
        toast.warning('İçerik İncelemesi', {
          description: payload.message || 'Gönderiniz incelemeye alındı.',
          duration: 6000,
        });
      }
    });

    return () => {
      if (feedSub) feedSub.unsubscribe();
      if (notifSub) notifSub.unsubscribe();
    };
  }, [subscribe, queryClient]);
}
