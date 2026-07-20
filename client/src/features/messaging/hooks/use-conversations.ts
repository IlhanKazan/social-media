import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PageResponse, ConversationResponse } from '@/types/api';

export function useConversations(enabled = true) {
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
    enabled,
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: number) => {
      await api.delete(`/conversations/${conversationId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
