import { useEffect } from 'react';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import type { MessageResponse, ReadReceiptPayload, PageResponse, ConversationResponse } from '@/types/api';

export function useMessagingWebSocket(activeConversationId?: number) {
  const { subscribe } = useWebSocket();
  const queryClient = useQueryClient();
  const account = useAuthStore((state) => state.account);

  useEffect(() => {
    if (!account) return;

    const msgSub = subscribe('/user/queue/messages', (message) => {
      const newMsg: MessageResponse = JSON.parse(message.body);
      const isMine = newMsg.sender.id === account.id;
      const convId = Number(newMsg.conversationId);

      if (!isMine && convId === activeConversationId) {
        api.put(`/conversations/${convId}/read`).catch(() => {});
      }

      queryClient.setQueryData<InfiniteData<PageResponse<MessageResponse>>>(
        ['messages', convId],
        (old) => {

          if (!old || !old.pages || old.pages.length === 0) return old;

          const newPages = [...old.pages];
          const firstPage = newPages[0];

          if (firstPage) {
            const filteredContent = firstPage.content.filter((m) => !m.isOptimistic);

            if (!filteredContent.some((m) => m.id === newMsg.id)) {
              newPages[0] = {
                ...firstPage,
                content: [newMsg, ...filteredContent],
              };
            }
          }
          return { ...old, pages: newPages };
        }
      );

      queryClient.setQueryData<InfiniteData<PageResponse<ConversationResponse>>>(
        ['conversations'],
        (old) => {
          if (!old || !old.pages || old.pages.length === 0) return old;

          const newPages = [...old.pages];
          let foundConv: ConversationResponse | undefined;

          for (let i = 0; i < newPages.length; i++) {
            const currentPage = newPages[i];
            if (!currentPage) continue;

            const convIndex = currentPage.content.findIndex((c) => c.id === convId);
            if (convIndex !== -1) {
              const targetConv = currentPage.content[convIndex];

              if (targetConv) {
                foundConv = { ...targetConv };
                newPages[i] = {
                  ...currentPage,
                  content: currentPage.content.filter((c) => c.id !== convId),
                };
                break;
              }
            }
          }

          if (foundConv) {
            foundConv.lastMessageAt = newMsg.createdAt;

            if (!isMine && convId !== activeConversationId) {
              foundConv.unreadCount += 1;
            } else if (!isMine && convId === activeConversationId) {
              foundConv.unreadCount = 0;
            }

            const firstPage = newPages[0];
            if (firstPage) {
              newPages[0] = {
                ...firstPage,
                content: [foundConv, ...firstPage.content],
              };
            }
            return { ...old, pages: newPages };
          } else {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            return old;
          }
        }
      );
    });

    const readSub = subscribe('/user/queue/read-receipts', (message) => {
      const payload: ReadReceiptPayload = JSON.parse(message.body);
      const convId = Number(payload.conversationId);

      queryClient.setQueryData<InfiniteData<PageResponse<MessageResponse>>>(
        ['messages', convId],
        (old) => {
          if (!old) return old;
          const newPages = old.pages.map((page) => ({
            ...page,
            content: page.content.map((m) => {
              if (!m.readAt && m.sender.id === account.id) {
                return { ...m, readAt: payload.readAt };
              }
              return m;
            }),
          }));
          return { ...old, pages: newPages };
        }
      );
    });

    return () => {
      msgSub?.unsubscribe();
      readSub?.unsubscribe();
    };
  }, [subscribe, queryClient, account, activeConversationId]);
}
