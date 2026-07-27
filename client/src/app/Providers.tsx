import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from '@/lib/query-client';
import { router } from '@/routes';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from "@/components/theme-provider.tsx";
import { LanguageProvider } from "@/components/language-provider";
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
// Side effect: initializes i18next before anything renders.
import '@/i18n';

export function Providers() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
            <Toaster />
          </QueryClientProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
