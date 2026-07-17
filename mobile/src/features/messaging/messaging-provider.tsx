import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';

import { api } from '@/lib/api';
import { useWebSocket } from '@/lib/ws';
import { useAuthStore } from '@/stores/auth-store';
import type {
  ConversationResponse,
  CursorPageResponse,
  MessageResponse,
  PageResponse,
  ReadReceiptPayload,
} from '@/types/api';

type MessagePages = InfiniteData<CursorPageResponse<MessageResponse>>;
type ConversationPages = InfiniteData<PageResponse<ConversationResponse>>;

interface MessagingContextValue {
  sendMessage: (conversationId: number, content: string) => void;
  setActiveConversationId: (id: number | undefined) => void;
}

const MessagingContext = createContext<MessagingContextValue>({
  sendMessage: () => {},
  setActiveConversationId: () => {},
});

function prependMessage(old: MessagePages | undefined, message: MessageResponse): MessagePages | undefined {
  if (!old || old.pages.length === 0) return old;
  const [first, ...rest] = old.pages;
  if (!first) return old;
  const withoutOptimistic = first.content.filter((m) => !m.isOptimistic);
  if (withoutOptimistic.some((m) => m.id === message.id)) return old;
  return { ...old, pages: [{ ...first, content: [message, ...withoutOptimistic] }, ...rest] };
}

export function MessagingProvider({ children }: { children: ReactNode }) {
  const { isConnected, subscribe, publish } = useWebSocket();
  const queryClient = useQueryClient();
  const account = useAuthStore((s) => s.account);

  // A ref (not effect deps) so the single subscription doesn't tear down and
  // re-create every time the user opens/closes a conversation.
  const activeConversationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isConnected || !account) return;

    const messageSub = subscribe('/user/queue/messages', (frame) => {
      const message = JSON.parse(frame.body) as MessageResponse;
      const isMine = message.sender.id === account.id;
      const convId = Number(message.conversationId);
      const isActive = convId === activeConversationRef.current;

      if (!isMine && isActive) {
        void api.put(`/conversations/${convId}/read`).catch(() => {});
      } else if (!isMine) {
        void queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
      }

      queryClient.setQueryData<MessagePages>(['messages', convId], (old) => prependMessage(old, message));

      queryClient.setQueryData<ConversationPages>(['conversations'], (old) => {
        if (!old || old.pages.length === 0) return old;
        let moved: ConversationResponse | undefined;
        const stripped = old.pages.map((page) => {
          const idx = page.content.findIndex((c) => c.id === convId);
          if (idx === -1 || moved) return page;
          moved = { ...page.content[idx]! };
          return { ...page, content: page.content.filter((c) => c.id !== convId) };
        });
        if (!moved) {
          void queryClient.invalidateQueries({ queryKey: ['conversations'] });
          return old;
        }
        moved.lastMessageContent = message.content ?? moved.lastMessageContent;
        moved.lastMessageAt = message.createdAt;
        if (!isMine && !isActive) {
          moved.unreadCount += 1;
        } else if (isActive) {
          moved.unreadCount = 0;
        }
        const [first, ...rest] = stripped;
        if (!first) return old;
        return { ...old, pages: [{ ...first, content: [moved, ...first.content] }, ...rest] };
      });
    });

    const readSub = subscribe('/user/queue/read-receipts', (frame) => {
      const payload = JSON.parse(frame.body) as ReadReceiptPayload;
      const convId = Number(payload.conversationId);
      queryClient.setQueryData<MessagePages>(['messages', convId], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            content: page.content.map((m) =>
              !m.readAt && m.sender.id === account.id ? { ...m, readAt: payload.readAt } : m
            ),
          })),
        };
      });
    });

    return () => {
      messageSub?.unsubscribe();
      readSub?.unsubscribe();
    };
  }, [isConnected, subscribe, queryClient, account]);

  const sendMessage = useCallback(
    (conversationId: number, content: string) => {
      if (!account) return;

      const optimistic: MessageResponse = {
        id: -Date.now(),
        conversationId,
        sender: {
          id: account.id,
          username: account.username,
          displayName: account.displayName,
          profileImageUrl: account.profileImageUrl ?? undefined,
          coverPosition: 0,
          followerCount: 0,
          followingCount: 0,
          isFollowing: false,
          emailVerified: account.emailVerified,
          joinedAt: new Date().toISOString(),
        },
        content,
        readAt: null,
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      };
      queryClient.setQueryData<MessagePages>(['messages', conversationId], (old) => {
        if (!old || old.pages.length === 0) return old;
        const [first, ...rest] = old.pages;
        if (!first) return old;
        return { ...old, pages: [{ ...first, content: [optimistic, ...first.content] }, ...rest] };
      });

      publish('/app/dm.send', { conversationId, content });
    },
    [account, publish, queryClient]
  );

  const setActiveConversationId = useCallback((id: number | undefined) => {
    activeConversationRef.current = id;
  }, []);

  const value = useMemo(
    () => ({ sendMessage, setActiveConversationId }),
    [sendMessage, setActiveConversationId]
  );

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function useMessaging() {
  return useContext(MessagingContext);
}
