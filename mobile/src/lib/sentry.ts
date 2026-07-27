import * as Sentry from '@sentry/react-native';

import { SENTRY_DSN } from '@/lib/env';

// No-op (SDK disabled) when no DSN is configured, e.g. in local dev.
Sentry.init({
  dsn: SENTRY_DSN,
  enabled: !!SENTRY_DSN,
  tracesSampleRate: 0.2,
});
