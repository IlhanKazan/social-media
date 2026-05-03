import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PageResponse, ConversationResponse } from '@/types/api';

export function useConversations() {
  return useInfiniteQuery<PageResponse<ConversationResponse>>({
    queryKey: ['conversations'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await api.get<PageResponse<ConversationResponse>>('/conversations', {
        params: { page: pageParam, size: 20 },
      });
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
  });
}
