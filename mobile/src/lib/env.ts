// Never throw at module scope: expo-router bundles every route eagerly on
// native, so a missing .env would crash the app before it can render anything.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://socialhan.ilhankazan.com';
// Crash reporting is opt-in: unset in dev, set EXPO_PUBLIC_SENTRY_DSN in
// production builds once a Sentry project exists.
export const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

const isLocalHost = /localhost|127\.0\.0\.1|10\.0\.2\.2/.test(API_BASE_URL);

/**
 * True when a shipped bundle is pointing at a development API.
 *
 * This is the failure `eas update` invites: the env block in eas.json is read
 * by `eas build` only, so an update published from a workstation picks up the
 * local `.env` instead and bakes localhost into a bundle that then ships to
 * real devices. Every request fails, the WebSocket never connects, and nothing
 * says why — so the app surfaces it rather than looking merely broken.
 *
 * Publish updates with `eas update --environment production` so the values come
 * from EAS rather than the local file.
 */
export const HAS_DEV_API_IN_RELEASE = !__DEV__ && isLocalHost;

if (!process.env.EXPO_PUBLIC_API_URL) {
  console.warn('EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env and restart with --clear.');
}

if (HAS_DEV_API_IN_RELEASE) {
  console.error(`Release bundle is pointing at ${API_BASE_URL}. Republish with --environment production.`);
}
