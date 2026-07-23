import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AccountSummary, AuthResponse } from '@/types/api';
import axios from 'axios';
import { useNotificationStore } from "@/stores/notification-store.ts";

const authUrl = (path: string) =>
  `${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}/api/v1/auth${path}`;

// Single-flight: the refresh token is single-use and rotated server-side, so two
// concurrent /refresh calls with the same cookie trip reuse-detection and kill the
// whole session. Every caller (interceptor, route guard, StrictMode double-invoke)
// shares this one in-flight promise.
let refreshInFlight: Promise<boolean> | null = null;

interface AuthState {
  token: string | null;
  account: AccountSummary | null;
  setAuth: (token: string, account: AccountSummary) => void;
  login: (response: AuthResponse) => void;
  logout: () => Promise<void>;
  tryRefresh: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      account: null,
      setAuth: (token, account) => set({ token, account }),
      login: (resp) => set({
        token: resp.accessToken,
        account: resp.account,
      }),
      logout: async () => {
        try {
          const token = useAuthStore.getState().token;
          await axios.post(authUrl('/logout'), null, {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
        } catch {
          // best-effort server-side revocation; clear local state regardless
        }

        set({ token: null, account: null });
        useNotificationStore.getState().reset();

        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      },
      tryRefresh: () => {
        if (refreshInFlight) return refreshInFlight;

        refreshInFlight = (async () => {
          try {
            const { data } = await axios.post<AuthResponse>(
              authUrl('/refresh'),
              null,
              { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
            );
            set({ token: data.accessToken, account: data.account });
            return true;
          } catch {
            set({ token: null, account: null });
            localStorage.removeItem('auth-storage');
            return false;
          }
        })().finally(() => {
          refreshInFlight = null;
        });

        return refreshInFlight;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        account: state.account,
      }),
    }
  )
);
