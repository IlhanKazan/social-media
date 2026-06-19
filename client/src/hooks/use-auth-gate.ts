import { useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useAuthGateStore } from '@/stores/auth-gate-store';

// requireAuth(action): run the action when logged in, otherwise open the soft
// login wall. Use it to wrap like/reply/repost/follow/DM handlers so a logged-out
// visitor is nudged to sign up instead of being bounced away from the content.
export function useAuthGate() {
  const openGate = useAuthGateStore((state) => state.openGate);

  const requireAuth = useCallback(
    (action: () => void) => {
      if (useAuthStore.getState().token) {
        action();
      } else {
        openGate();
      }
    },
    [openGate]
  );

  return { requireAuth };
}
