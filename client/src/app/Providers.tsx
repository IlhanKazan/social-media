import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from '@/lib/query-client';
import { router } from '@/routes';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from "@/components/theme-provider.tsx";
import { LanguageProvider } from "@/components/language-provider";
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useSessionBootstrap } from '@/hooks/use-session-bootstrap';
import { useSentryUser } from '@/hooks/use-sentry-user';
// Side effect: initializes i18next before anything renders.
import '@/i18n';

// Sits above the router so a reloaded session is restored on public routes too,
// which never mount RequireAuth. Inside QueryClientProvider because it has to
// invalidate the queries that raced it.
function SessionBootstrap() {
  useSessionBootstrap();
  useSentryUser();
  return null;
}

export function Providers() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <SessionBootstrap />
            <RouterProvider router={router} />
            <Toaster />
          </QueryClientProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
