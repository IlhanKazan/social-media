import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type {
  ConversationResponse,
  CursorPageResponse,
  MessageResponse,
  PageResponse,
} from '@/types/api';

const PAGE_SIZE = 20;

export function useStartConversation() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: number) => {
      const { data } = await api.post<ConversationResponse>(`/conversations/with/${accountId}`);
      return data;
    },
    onSuccess: (conversation) => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      router.push({
        pathname: '/conversation/[id]',
        params: {
          id: String(conversation.id),
          name: conversation.otherParticipant.displayName || conversation.otherParticipant.username,
        },
      });
    },
  });
}

export function useConversations() {
  return useInfiniteQuery<PageResponse<ConversationResponse>>({
    queryKey: ['conversations'],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<PageResponse<ConversationResponse>>('/conversations', {
        params: { page: pageParam, size: PAGE_SIZE },
      });
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
  });
}

export function useMessages(conversationId: number | undefined) {
  return useInfiniteQuery<CursorPageResponse<MessageResponse>>({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<CursorPageResponse<MessageResponse>>(
        `/conversations/${conversationId}/messages/cursor`,
        { params: { size: PAGE_SIZE, before: pageParam ?? undefined } }
      );
      return data;
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled: !!conversationId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: number) => {
      await api.put(`/conversations/${conversationId}/read`);
    },
    onSuccess: (_data, conversationId) => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
      void queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });
}

export function useUnreadMessageCount() {
  const token = useAuthStore((s) => s.token);
  return useQuery<number>({
    queryKey: ['messages', 'unread-count'],
    queryFn: async () => {
      const { data } = await api.get<number>('/conversations/unread-count');
      return data;
    },
    enabled: !!token,
    refetchInterval: 30_000,
  });
}
