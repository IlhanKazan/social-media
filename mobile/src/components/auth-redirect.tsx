import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';

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
 * Watching the store centrally means every screen is covered — including ones
 * added later, which a per-screen guard would silently miss.
 */
export function AuthRedirect() {
  const token = useAuthStore((s) => s.token);
  const hydrated = useAuthStore((s) => s.hydrated);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Before rehydration the absence of a token means nothing yet.
    if (!hydrated || token) return;

    const first = segments[0];
    if (first && PUBLIC_SEGMENTS.has(first)) return;

    router.replace('/login');
  }, [token, hydrated, segments, router]);

  return null;
}
