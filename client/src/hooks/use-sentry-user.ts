import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { setSentryUser } from '@/lib/sentry';

/**
 * Keeps Sentry's user context in step with the session.
 *
 * Without it every issue is anonymous, so "three users hit this" and "one user
 * hit it three times" look identical — and a bug report cannot be matched to
 * the error it describes.
 */
export function useSentryUser() {
  const account = useAuthStore((state) => state.account);

  useEffect(() => {
    setSentryUser(account ? { id: account.id, username: account.username } : null);
  }, [account]);
}
