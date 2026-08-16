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

// Fallback when a response doesn't carry an explicit TTL. Deliberately shorter
// than the server's 15min so a stale assumption expires early rather than late.
const DEFAULT_ACCESS_TTL_MS = 10 * 60 * 1000;

// These use bare axios rather than the configured `api` instance, so they carry
// no timeout of their own. Without one a stalled network leaves the refresh
// promise pending forever, and every gate that waits on it hangs with it.
const AUTH_TIMEOUT_MS = 15_000;

interface AuthState {
  token: string | null;
  account: AccountSummary | null;
  /** Absolute epoch-ms the current access token expires at; null when signed out. */
  tokenExpiresAt: number | null;
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
      tokenExpiresAt: null,
      setAuth: (token, account) => set({
        token,
        account,
        tokenExpiresAt: Date.now() + DEFAULT_ACCESS_TTL_MS,
      }),
      login: (resp) => set({
        token: resp.accessToken,
        account: resp.account,
        tokenExpiresAt: Date.now() + (resp.accessTokenExpiresIn || DEFAULT_ACCESS_TTL_MS),
      }),
      logout: async () => {
        try {
          const token = useAuthStore.getState().token;
          await axios.post(authUrl('/logout'), null, {
            withCredentials: true,
            timeout: AUTH_TIMEOUT_MS,
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
        } catch {
          // best-effort server-side revocation; clear local state regardless
        }

        set({ token: null, account: null, tokenExpiresAt: null });
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
              { withCredentials: true, headers: { 'Content-Type': 'application/json' }, timeout: AUTH_TIMEOUT_MS }
            );
            set({
              token: data.accessToken,
              account: data.account,
              tokenExpiresAt: Date.now() + (data.accessTokenExpiresIn || DEFAULT_ACCESS_TTL_MS),
            });
            return true;
          } catch (error) {
            // Sign out only when the server actually refused the cookie. On a
            // timeout or a 5xx the session may well still be valid, so leave it
            // untouched and let the next attempt recover — every route guard
            // keys off `token`, so clearing it here is a real logout.
            const status = axios.isAxiosError(error) ? error.response?.status : undefined;
            if (status !== undefined && status >= 400 && status < 500) {
              set({ token: null, account: null, tokenExpiresAt: null });
              localStorage.removeItem('auth-storage');
            }
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
