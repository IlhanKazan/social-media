import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AccountSummary } from '@/types/api';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  account: AccountSummary | null;
  setAuth: (token: string, refreshToken: string, account: AccountSummary) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      account: null,
      setAuth: (token, refreshToken, account) => set({ token, refreshToken, account }),
      logout: () => set({ token: null, refreshToken: null, account: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        account: state.account,
      }),
    }
  )
);
