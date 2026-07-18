import axios from 'axios';

import { API_BASE_URL } from '@/lib/env';

// Deliberately dependency-free (no @/lib/api, no @/stores/auth-store) so
// auth-store's logout() can unregister the device token without creating a
// store <-> lib import cycle.
let cachedDeviceToken: string | null = null;

export function setCachedDeviceToken(token: string | null) {
  cachedDeviceToken = token;
}

export async function unregisterCurrentDevice(accessToken: string | null) {
  const token = cachedDeviceToken;
  if (!token || !accessToken) return;
  cachedDeviceToken = null;
  try {
    await axios.delete(`${API_BASE_URL}/api/v1/devices/${encodeURIComponent(token)}`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'X-Client-Platform': 'mobile' },
    });
  } catch {
    // best-effort; server-side tokens also self-prune once FCM reports them stale
  }
}
