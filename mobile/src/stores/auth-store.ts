import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { unregisterCurrentDevice } from '@/lib/device-token';
import { API_BASE_URL } from '@/lib/env';
import { clearRefreshToken, getRefreshToken, setRefreshToken } from '@/lib/storage';
import type { AccountSummary, AuthResponse } from '@/types/api';

const authUrl = (path: string) => `${API_BASE_URL}/api/v1/auth${path}`;

const MOBILE_HEADERS = { 'X-Client-Platform': 'mobile' };

// These calls use bare axios, not the configured `api` instance, so they carry
// no timeout of their own. Without one a stalled network leaves the refresh
// promise pending forever — and SessionGate, which only stops showing its
// spinner in that promise's .finally(), waits with it.
const AUTH_TIMEOUT_MS = 15_000;

// Single-flight: the refresh token is single-use and rotated server-side, so two
// concurrent /refresh calls trip reuse-detection and kill the whole session.
// Every caller (interceptor, auth gate) shares this one in-flight promise.
let refreshInFlight: Promise<boolean> | null = null;

// Fallback when a response doesn't carry an explicit TTL. Deliberately shorter
// than the server's 15min so a stale assumption expires early rather than late.
const DEFAULT_ACCESS_TTL_MS = 10 * 60 * 1000;

interface AuthState {
  token: string | null;
  account: AccountSummary | null;
  /** Absolute epoch-ms the current access token expires at; null when signed out. */
  tokenExpiresAt: number | null;
  hydrated: boolean;
  setHydrated: () => void;
  login: (response: AuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  tryRefresh: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      account: null,
      tokenExpiresAt: null,
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      login: async (resp) => {
        if (resp.refreshToken) {
          await setRefreshToken(resp.refreshToken);
        }
        set({
          token: resp.accessToken,
          account: resp.account,
          tokenExpiresAt: Date.now() + (resp.accessTokenExpiresIn || DEFAULT_ACCESS_TTL_MS),
        });
      },
      logout: async () => {
        // Unregister before /auth/logout blacklists the access token below.
        await unregisterCurrentDevice(get().token);

        const refreshToken = await getRefreshToken();
        try {
          await axios.post(authUrl('/logout'), { refreshToken }, {
            headers: {
              ...MOBILE_HEADERS,
              ...(get().token ? { Authorization: `Bearer ${get().token}` } : {}),
            },
            timeout: AUTH_TIMEOUT_MS,
          });
        } catch {
          // best-effort server-side revocation; clear local state regardless
        }
        await clearRefreshToken();
        set({ token: null, account: null, tokenExpiresAt: null });
      },
      tryRefresh: () => {
        if (refreshInFlight) return refreshInFlight;

        refreshInFlight = (async () => {
          const refreshToken = await getRefreshToken();
          if (!refreshToken) {
            set({ token: null, account: null, tokenExpiresAt: null });
            return false;
          }
          try {
            const { data } = await axios.post<AuthResponse>(
              authUrl('/refresh'),
              { refreshToken },
              { headers: MOBILE_HEADERS, timeout: AUTH_TIMEOUT_MS }
            );
            if (data.refreshToken) {
              await setRefreshToken(data.refreshToken);
            }
            set({
              token: data.accessToken,
              account: data.account,
              tokenExpiresAt: Date.now() + (data.accessTokenExpiresIn || DEFAULT_ACCESS_TTL_MS),
            });
            return true;
          } catch (error) {
            // Only a rejection from the server proves the credential is dead.
            // A timeout, a dropped connection or a 5xx says nothing about it, so
            // the session is left exactly as it was and the next attempt can
            // recover — signing the user out over a momentary network blip is
            // both wrong and, since every route keys off `token`, indistinguishable
            // from a real logout.
            const status = axios.isAxiosError(error) ? error.response?.status : undefined;
            const rejected = status !== undefined && status >= 400 && status < 500;
            if (rejected) {
              await clearRefreshToken();
              set({ token: null, account: null, tokenExpiresAt: null });
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
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ account: state.account }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);
