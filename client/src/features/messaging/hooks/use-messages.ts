import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PageResponse, MessageResponse } from '@/types/api';

export function useMessages(conversationId: number) {
  return useInfiniteQuery<PageResponse<MessageResponse>>({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await api.get<PageResponse<MessageResponse>>(`/conversations/${conversationId}/messages`, {
        params: { page: pageParam, size: 50 },
      });
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
    enabled: !!conversationId,
  });
}

export function useMarkMessagesRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: number) => {
      await api.put(`/conversations/${conversationId}/read`);
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });
}
