import { Outlet, useMatch, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { WebSocketProvider } from '@/hooks/use-websocket';
import { useEffect } from "react";
import { useNotificationStore } from "@/stores/notification-store.ts";
import { useAuthStore } from "@/stores/auth-store.ts";
import { useMessagingWebSocket } from '@/features/messaging/hooks/use-messaging-websocket';
import { RightSidebarSearch } from '@/features/search/components/RightSidebarSearch';
import { cn } from '@/lib/utils';

function LayoutContent() {
  const match = useMatch('/messages/:conversationId');
  const location = useLocation();
  const activeConversationId = match?.params.conversationId ? Number(match.params.conversationId) : undefined;

  useMessagingWebSocket(activeConversationId);

  const isMessagesPage = location.pathname.startsWith('/messages');

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl justify-center">
      <Sidebar />

      <main className={cn(
        "flex min-h-screen w-full min-w-0 flex-col border-x border-zinc-100 dark:border-zinc-800/50",
        isMessagesPage ? "max-w-[600px] lg:max-w-[920px]" : "max-w-[600px]"
      )}>
        <Outlet />
      </main>

      <aside className={cn(
        "sticky top-0 h-screen w-80 shrink-0 flex-col py-3 px-4 gap-4",
        isMessagesPage ? "hidden" : "hidden lg:flex"
      )}>
        <RightSidebarSearch />

        <div className="rounded-2xl border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800/50 dark:bg-zinc-900/30">
          <h3 className="mb-2 font-bold text-[17px]">Kimi Takip Etmeli</h3>
          <p className="leading-relaxed text-sm text-muted-foreground">
            Önerilen kullanıcılar ve trendler modülü yakında eklenecek.
          </p>
        </div>
      </aside>
    </div>
  );
}

export function AppLayout() {
  const account = useAuthStore((state) => state.account);
  const fetchUnread = useNotificationStore((state) => state.fetchUnreadCount);

  useEffect(() => {
    if (account) {
      fetchUnread();
    }
  }, [fetchUnread, account?.id]);

  return (
    <WebSocketProvider>
      <LayoutContent />
    </WebSocketProvider>
  );
}
