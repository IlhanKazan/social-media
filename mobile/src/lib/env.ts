// Never throw at module scope: expo-router bundles every route eagerly on
// native, so a missing .env would crash the app before it can render anything.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

if (!process.env.EXPO_PUBLIC_API_URL) {
  console.warn('EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env and restart with --clear.');
}
