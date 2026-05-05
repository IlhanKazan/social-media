import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CursorPageResponse, MessageResponse } from '@/types/api';

export function useMessages(conversationId: number | undefined) {
  return useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ size: '20' });
      if (pageParam) params.append('before', pageParam.toString());

      const { data } = await api.get<CursorPageResponse<MessageResponse>>(
        `/conversations/${conversationId}/messages/cursor?${params.toString()}`
      );
      return data;
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    initialPageParam: undefined as number | undefined,
    enabled: !!conversationId,
    staleTime: 1000 * 60 * 5,
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
