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

export function useSendDmImage(conversationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ uri, caption }: { uri: string; caption?: string }) => {
      const filename = uri.split('/').pop() ?? 'photo.jpg';
      const extension = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mimeType = extension === 'png' ? 'image/png'
        : extension === 'webp' ? 'image/webp'
        : extension === 'gif' ? 'image/gif'
        : 'image/jpeg';

      const formData = new FormData();
      // RN's FormData takes a { uri, name, type } descriptor instead of a Blob.
      formData.append('file', { uri, name: filename, type: mimeType } as unknown as Blob);
      if (caption) formData.append('caption', caption);

      const { data } = await api.post<MessageResponse>(
        `/conversations/${conversationId}/messages/image`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useSharePostToDm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      postId,
      caption,
    }: {
      conversationId: number;
      postId: number;
      caption?: string;
    }) => {
      const { data } = await api.post<MessageResponse>(`/conversations/${conversationId}/messages/share`, {
        postId,
        caption: caption?.trim() || null,
      });
      return data;
    },
    onSuccess: (_data, { conversationId }) => {
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
      void queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
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
