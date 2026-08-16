import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Restores the access token after a cold load.
 *
 * Only `account` is persisted — the access token deliberately never touches
 * localStorage — so a full reload leaves the app knowing *who* is signed in
 * while holding no credential. `RequireAuth` recovers it, but the feed,
 * explore, profiles and post detail are public routes that never mount it
 * (Phase 38). There a reloaded session rendered as signed in while every
 * authenticated request went out bare and came back 403, and anything gated on
 * the token — the feed itself — never fired at all.
 *
 * Runs at most once per page load. `tryRefresh` is single-flight, so racing
 * with `RequireAuth` on a protected route collapses into one rotation rather
 * than tripping server-side reuse detection.
 */
export function useSessionBootstrap() {
  const account = useAuthStore((state) => state.account);
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || token || !account) return;
    attempted.current = true;

    void useAuthStore.getState().tryRefresh().then((refreshed) => {
      // Queries that raced the bootstrap already resolved 403 and will not
      // recover on their own: the retry policy excludes 4xx, so they stay
      // errored until something invalidates them.
      if (refreshed) void queryClient.invalidateQueries();
    });
  }, [account, token, queryClient]);
}
