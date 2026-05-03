import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import type { MessageResponse, ReadReceiptPayload } from '@/types/api';

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

      queryClient.invalidateQueries({ queryKey: ['messages', convId] });
      queryClient.invalidateQueries({ queryKey: ['messages', String(convId)] });

      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    const readSub = subscribe('/user/queue/read-receipts', (message) => {
      const payload: ReadReceiptPayload = JSON.parse(message.body);
      const convId = Number(payload.conversationId);

      queryClient.invalidateQueries({ queryKey: ['messages', convId] });
      queryClient.invalidateQueries({ queryKey: ['messages', String(convId)] });
    });

    return () => {
      msgSub?.unsubscribe();
      readSub?.unsubscribe();
    };
  }, [subscribe, queryClient, account, activeConversationId]);
}
