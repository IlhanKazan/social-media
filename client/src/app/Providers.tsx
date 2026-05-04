import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from '@/lib/query-client';
import { router } from '@/routes';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from "@/components/theme-provider.tsx";
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export function Providers() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
