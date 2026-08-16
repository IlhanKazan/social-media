import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

/**
 * Crash reporting for the browser.
 *
 * The highest-value place to have it: server exceptions already reach us
 * through container logs and Prometheus, but a failure in someone else's
 * browser leaves no trace at all unless it is reported.
 *
 * Disabled entirely without a DSN, so local development stays quiet and no
 * build-time configuration is mandatory.
 */
export function initSentry() {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    // Tied to the build so a regression can be traced to the deploy that
    // introduced it rather than to "some time last week".
    release: import.meta.env.VITE_RELEASE as string | undefined,

    // A portfolio-scale app does not need every transaction, and the free tier
    // is a fixed monthly allowance — sampling keeps errors from being dropped
    // because traces exhausted the quota first.
    tracesSampleRate: 0.1,

    // Personal data must not leave the browser. Users write private messages
    // here, so anything that could carry message text is off: no request
    // bodies, no input values, no cookies.
    sendDefaultPii: false,

    beforeBreadcrumb(breadcrumb) {
      // A console breadcrumb can contain anything the app happened to log,
      // including message content during development.
      if (breadcrumb.category === 'console') return null;
      return breadcrumb;
    },

    beforeSend(event) {
      // Strip query strings: reset and verification tokens travel there, and a
      // captured URL would put a working credential in the issue tracker.
      if (event.request?.url) {
        event.request.url = event.request.url.split('?')[0];
      }
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
      }
      return event;
    },
  });
}

/** Attaches the signed-in account so an issue can be traced to a report. */
export function setSentryUser(user: { id: number; username: string } | null) {
  if (!DSN) return;
  // Username, never email: enough to correlate a bug report, nothing more.
  Sentry.setUser(user ? { id: String(user.id), username: user.username } : null);
}
