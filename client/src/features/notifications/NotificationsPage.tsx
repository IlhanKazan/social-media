import { useEffect, useState } from 'react';
import { Loader2, CheckCheck } from 'lucide-react';
import { useNotifications, useMarkAllAsRead } from './hooks/use-notifications';
import { useNotificationStore } from '@/stores/notification-store';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { NotificationCard } from './components/NotificationCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

export function NotificationsPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useNotifications();
  const markAllAsRead = useMarkAllAsRead();
  const clearUnread = useNotificationStore((state) => state.clearUnread);
  const [activeTab, setActiveTab] = useState('all');
  const { targetRef, isIntersecting } = useIntersectionObserver({ threshold: 0.5 });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate(undefined, {
      onSuccess: () => clearUnread()
    });
  };

  const notifications = data?.pages.flatMap(page => page.content) || [];
  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter(n => n.readAt === null)
    : notifications;

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-background/80 px-4 py-3 backdrop-blur-md dark:border-zinc-800/50">
        <h1 className="text-xl font-bold">Bildirimler</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMarkAllAsRead}
          disabled={markAllAsRead.isPending || notifications.every(n => n.readAt !== null)}
          className="h-8 gap-2 text-xs"
        >
          <CheckCheck className="h-4 w-4" />
          <span className="hidden sm:inline">Tümünü Okundu İşaretle</span>
        </Button>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-zinc-100 bg-transparent p-0 h-12 dark:border-zinc-800/50">
          <TabsTrigger value="all" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">
            Tümü
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">
            Okunmayanlar
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-col">
          {status === 'pending' ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : status === 'error' ? (
            <div className="p-4 text-center text-sm text-destructive">Bildirimler yüklenemedi.</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {activeTab === 'unread' ? 'Okunmamış bildiriminiz yok.' : 'Henüz bildiriminiz yok.'}
            </div>
          ) : (
            <>
              {filteredNotifications.map((notification) => (
                <NotificationCard key={notification.id} notification={notification} />
              ))}
              <div ref={targetRef} className="flex h-16 items-center justify-center">
                {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              </div>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
}
