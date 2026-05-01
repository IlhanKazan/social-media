import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AccountSummary, AuthResponse } from '@/types/api';
import axios from 'axios';
import {useNotificationStore} from "@/stores/notification-store.ts";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  account: AccountSummary | null;
  setAuth: (token: string, refreshToken: string, account: AccountSummary) => void;
  login: (response: AuthResponse) => void;
  logout: () => Promise<void>;
  tryRefresh: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      account: null,
      setAuth: (token, refreshToken, account) => set({ token, refreshToken, account }),
      login: (resp) => set({
        token: resp.accessToken,
        refreshToken: resp.refreshToken,
        account: resp.account,
      }),
      logout: async () => {
        const { refreshToken } = get();
        if (refreshToken) {
          try {
            await axios.post(
              `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'}/auth/logout`,
              { refreshToken }
            );
          } catch {
          }
        }
        set({ token: null, refreshToken: null, account: null });
        useNotificationStore.getState().reset();
      },
      tryRefresh: async () => {
        const currentRefresh = get().refreshToken;
        if (!currentRefresh) return false;
        try {
          const { data } = await axios.post<AuthResponse>(
            `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'}/auth/refresh`,
            { refreshToken: currentRefresh }
          );
          set({
            token: data.accessToken,
            refreshToken: data.refreshToken,
            account: data.account
          });
          return true;
        } catch {
          set({ token: null, refreshToken: null, account: null });
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        account: state.account,
      }),
    }
  )
);
