import { useEffect, useState } from 'react';
import { Loader2, CheckCheck, Bell, BellOff, Trash2 } from 'lucide-react';
import { useNotifications, useMarkAllAsRead, useDeleteAllNotifications } from './hooks/use-notifications';
import { useNotificationStore } from '@/stores/notification-store';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { NotificationCard } from './components/NotificationCard';
import { NotificationSkeleton } from '@/components/shared/NotificationSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function NotificationsPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useNotifications();
  const markAllAsRead = useMarkAllAsRead();
  const deleteAll = useDeleteAllNotifications();
  const clearUnread = useNotificationStore((state) => state.clearUnread);
  const [activeTab, setActiveTab] = useState('all');
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const { targetRef, isIntersecting } = useIntersectionObserver({ threshold: 0.5 });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
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

  let tabContent;
  if (status === 'pending') {
    tabContent = (
      <div className="flex flex-col">
        {[1, 2, 3, 4, 5, 6].map(i => <NotificationSkeleton key={i} />)}
      </div>
    );
  } else if (status === 'error') {
    tabContent = (
      <EmptyState
        icon={<BellOff className="h-12 w-12 text-destructive" />}
        title="Yüklenemedi"
        description="Bildirimler getirilirken bir sorun oluştu."
      />
    );
  } else if (filteredNotifications.length === 0) {
    tabContent = (
      <EmptyState
        icon={<Bell className="h-12 w-12" />}
        title="Bildirim Yok"
        description={activeTab === 'unread' ? 'Okunmamış bildiriminiz yok.' : 'Henüz bildiriminiz yok.'}
      />
    );
  } else {
    tabContent = (
      <>
        {filteredNotifications.map((notification) => (
          <NotificationCard key={notification.id} notification={notification} />
        ))}
        <div ref={targetRef} className="flex h-16 items-center justify-center">
          {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-background/80 px-4 py-3 backdrop-blur-md dark:border-zinc-800/50">
        <h1 className="text-xl font-bold">Bildirimler</h1>
        <div className="flex items-center gap-1">
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteAllOpen(true)}
            disabled={deleteAll.isPending || notifications.length === 0}
            className="h-8 gap-2 text-xs text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Tümünü Sil</span>
          </Button>
        </div>
      </div>

      <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Tüm bildirimler silinsin mi?</DialogTitle>
            <DialogDescription>Bu işlem geri alınamaz.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />}>Vazgeç</DialogClose>
            <Button
              variant="destructive"
              disabled={deleteAll.isPending}
              onClick={() =>
                deleteAll.mutate(undefined, {
                  onSuccess: () => {
                    clearUnread();
                    setDeleteAllOpen(false);
                  },
                })
              }
            >
              {deleteAll.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Tümünü Sil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start rounded-none border-b border-zinc-100 bg-transparent p-0 h-12 dark:border-zinc-800/50">
          <TabsTrigger value="all" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">
            Tümü
          </TabsTrigger>
          <TabsTrigger value="unread" className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none">
            Okunmayanlar
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-col">
          {tabContent}
        </div>
      </Tabs>
    </div>
  );
}
