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

// Single-flight: the refresh token is single-use and rotated server-side, so two
// concurrent /refresh calls trip reuse-detection and kill the whole session.
// Every caller (interceptor, auth gate) shares this one in-flight promise.
let refreshInFlight: Promise<boolean> | null = null;

interface AuthState {
  token: string | null;
  account: AccountSummary | null;
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
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      login: async (resp) => {
        if (resp.refreshToken) {
          await setRefreshToken(resp.refreshToken);
        }
        set({ token: resp.accessToken, account: resp.account });
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
          });
        } catch {
          // best-effort server-side revocation; clear local state regardless
        }
        await clearRefreshToken();
        set({ token: null, account: null });
      },
      tryRefresh: () => {
        if (refreshInFlight) return refreshInFlight;

        refreshInFlight = (async () => {
          const refreshToken = await getRefreshToken();
          if (!refreshToken) {
            set({ token: null, account: null });
            return false;
          }
          try {
            const { data } = await axios.post<AuthResponse>(
              authUrl('/refresh'),
              { refreshToken },
              { headers: MOBILE_HEADERS }
            );
            if (data.refreshToken) {
              await setRefreshToken(data.refreshToken);
            }
            set({ token: data.accessToken, account: data.account });
            return true;
          } catch {
            await clearRefreshToken();
            set({ token: null, account: null });
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
