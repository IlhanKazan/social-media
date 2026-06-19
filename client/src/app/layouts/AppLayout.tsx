import { Outlet, useMatch, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { WebSocketProvider } from '@/hooks/use-websocket';
import { useEffect } from "react";
import { useNotificationStore } from "@/stores/notification-store.ts";
import { useAuthStore } from "@/stores/auth-store.ts";
import { useMessagingWebSocket } from '@/features/messaging/hooks/use-messaging-websocket';
import { RightSidebarSearch } from '@/features/search/components/RightSidebarSearch';
import { cn } from '@/lib/utils';
import {SuggestedUsers} from "@/features/profile/components/SuggestedUsers.tsx";
import { SoftAuthGate } from '@/components/shared/SoftAuthGate';

function LayoutContent() {
  const match = useMatch('/messages/:conversationId');
  const location = useLocation();
  const account = useAuthStore((state) => state.account);
  const activeConversationId = match?.params.conversationId ? Number(match.params.conversationId) : undefined;

  useMessagingWebSocket(activeConversationId);

  const isMessagesPage = location.pathname.startsWith('/messages');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-7xl justify-center">
      <Sidebar />

      <main className={cn(
        "flex w-full min-w-0 flex-col border-x border-zinc-100 dark:border-zinc-800/50",
        isMessagesPage ? "h-[100dvh] overflow-hidden" : "min-h-[100dvh]",
        !isMessagesPage && "pb-14 md:pb-0",
        isMessagesPage ? "max-w-[600px] lg:max-w-[920px]" : "max-w-[600px]"
      )}>
        <Outlet />
      </main>

      <aside className={cn(
        "sticky top-0 h-[100dvh] w-80 shrink-0 flex-col py-3 px-4 gap-4",
        isMessagesPage ? "hidden" : "hidden lg:flex"
      )}>
        <RightSidebarSearch />

        {account && <SuggestedUsers />}
      </aside>

      <BottomNav />
      <SoftAuthGate />
    </div>
  );
}

export function AppLayout() {
  const account = useAuthStore((state) => state.account);
  const fetchUnread = useNotificationStore((state) => state.fetchUnreadCount);

  useEffect(() => {
    if (account) {
      void fetchUnread();
    }
  }, [fetchUnread, account?.id]);

  return (
    <WebSocketProvider>
      <LayoutContent />
    </WebSocketProvider>
  );
}
