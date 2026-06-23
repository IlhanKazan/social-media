import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { MessageResponse, PageResponse, PublicAccountResponse } from '@/types/api';

function optimisticSender(): PublicAccountResponse {
  const account = useAuthStore.getState().account!;
  return {
    id: account.id,
    username: account.username,
    displayName: account.displayName,
    profileImageUrl: account.profileImageUrl ?? undefined,
    bio: undefined,
    coverImageUrl: undefined,
    coverPosition: 50,
    emailVerified: false,
    followerCount: 0,
    followingCount: 0,
    isFollowing: false,
    joinedAt: new Date().toISOString(),
  };
}

function prependMessage(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: number,
  message: MessageResponse,
) {
  queryClient.setQueryData<InfiniteData<PageResponse<MessageResponse>>>(['messages', conversationId], (old) => {
    if (!old) return old;
    const pages = [...old.pages];
    if (pages[0]) pages[0] = { ...pages[0], content: [message, ...pages[0].content] };
    return { ...old, pages };
  });
}

function removeMessage(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: number,
  messageId: number,
) {
  queryClient.setQueryData<InfiniteData<PageResponse<MessageResponse>>>(['messages', conversationId], (old) => {
    if (!old) return old;
    return { ...old, pages: old.pages.map((p) => ({ ...p, content: p.content.filter((m) => m.id !== messageId) })) };
  });
}

export function useSendDmImage(conversationId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, caption }: { file: File; caption?: string }) => {
      const form = new FormData();
      form.append('file', file);
      if (caption?.trim()) form.append('caption', caption.trim());
      const { data } = await api.post<MessageResponse>(
        `/conversations/${conversationId}/messages/image`,
        form,
      );
      return data;
    },
    onMutate: ({ file, caption }) => {
      const tempId = -Date.now();
      prependMessage(queryClient, conversationId, {
        id: tempId,
        conversationId,
        sender: optimisticSender(),
        content: caption?.trim() || null,
        imageUrl: URL.createObjectURL(file),
        sharedPost: null,
        readAt: null,
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      });
      return { tempId };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.tempId != null) removeMessage(queryClient, conversationId, ctx.tempId);
      toast.error('Fotoğraf gönderilemedi');
    },
  });
}

export function useSharePostToDm() {
  return useMutation({
    mutationFn: async ({ conversationId, postId, caption }: { conversationId: number; postId: number; caption?: string }) => {
      const { data } = await api.post<MessageResponse>(`/conversations/${conversationId}/messages/share`, {
        postId,
        caption: caption?.trim() || null,
      });
      return data;
    },
    onSuccess: () => toast.success('Gönderildi'),
    onError: () => toast.error('Paylaşılamadı'),
  });
}
