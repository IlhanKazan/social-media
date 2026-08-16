import { useEffect } from 'react';
import { useRootNavigationState, useRouter, useSegments } from 'expo-router';

import { useAuthStore } from '@/stores/auth-store';

// Screens a signed-out visitor is allowed to stay on. Everything else in the
// stack is for someone with a session.
const PUBLIC_SEGMENTS = new Set(['(auth)', 'legal']);

/**
 * Sends the user back to sign-in the moment the session ends, wherever they are.
 *
 * The tab layout already redirects when it has no token, but it only guards its
 * own subtree: settings, conversations, profiles and the edit-profile modal are
 * siblings in the root stack, so signing out from any of them cleared the token
 * and left the screen sitting there, still rendering a session that no longer
 * existed.
 *
 * Three conditions have to hold before it may navigate, and all three were
 * learned from it going wrong:
 *
 * - The root navigator must have mounted. Calling replace() before it exists
 *   does not throw; it hangs, which is what a "stuck on the loading screen"
 *   report actually looks like.
 * - `segments` must be populated. It is briefly empty on a cold start, and an
 *   empty first segment is not a public segment, so the old code read that
 *   moment as "signed out on a private screen" and redirected out of a screen
 *   the user had not reached yet.
 * - The route must not already be the sign-in screen, or every render replaces
 *   the route with itself.
 */
export function AuthRedirect() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const router = useRouter();

  // Depend on the joined path rather than the array: `useSegments` returns a
  // fresh array on every render, which would re-run this effect constantly.
  const path = segments.join('/');

  useEffect(() => {
    if (!navigationState?.key) return;
    if (!hydrated || token) return;
    if (path.length === 0) return;

    const first = path.split('/')[0];
    if (first && PUBLIC_SEGMENTS.has(first)) return;

    router.replace('/login');
  }, [token, hydrated, path, navigationState?.key, router]);

  return null;
}
