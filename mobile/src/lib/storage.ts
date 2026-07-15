import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const REFRESH_TOKEN_KEY = 'socialhan.refresh-token';

// expo-secure-store has no web implementation; the web target is a dev
// convenience only, so plain localStorage is an acceptable fallback there.
const isWeb = Platform.OS === 'web';

export async function getRefreshToken(): Promise<string | null> {
  if (isWeb) return localStorage.getItem(REFRESH_TOKEN_KEY);
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  if (isWeb) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function clearRefreshToken(): Promise<void> {
  if (isWeb) {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
