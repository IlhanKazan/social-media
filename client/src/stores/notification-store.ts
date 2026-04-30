import { create } from 'zustand';
import { api } from '@/lib/api';

interface NotificationState {
  unreadCount: number;
  incrementUnread: () => void;
  decrementUnread: () => void;
  setUnreadCount: (count: number) => void;
  clearUnread: () => void;
  reset: () => void;
  fetchUnreadCount: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  decrementUnread: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  setUnreadCount: (count) => set({ unreadCount: count }),
  clearUnread: () => set({ unreadCount: 0 }),

  reset: () => set({ unreadCount: 0 }),

  fetchUnreadCount: async () => {
    try {
      const response = await api.get<number>('/notifications/unread-count');
      set({ unreadCount: response.data });
    } catch (error) {
      console.error('Bildirim sayısı alınamadı:', error);
    }
  },
}));
