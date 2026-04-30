import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { WebSocketProvider } from '@/hooks/use-websocket';
import {useEffect} from "react";
import {useNotificationStore} from "@/stores/notification-store.ts";
import {useAuthStore} from "@/stores/auth-store.ts";

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
      <div className="mx-auto flex min-h-screen w-full max-w-7xl justify-center">
        <Sidebar />

        <main className="flex min-h-screen w-full min-w-0 flex-1 flex-col border-x border-zinc-100 sm:max-w-[600px] dark:border-zinc-800/50">
          <Outlet />
        </main>

        <aside className="sticky top-0 hidden h-screen w-80 shrink-0 flex-col p-6 lg:flex">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800/50 dark:bg-zinc-900/50">
            <h3 className="mb-2 font-bold">Kimi Takip Etmeli</h3>
            <p className="leading-relaxed text-sm text-muted-foreground">
              Önerilen kullanıcılar ve trendler modülü yakında eklenecek.
            </p>
          </div>
        </aside>
      </div>
    </WebSocketProvider>
  );
}
