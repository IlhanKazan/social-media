import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

// RN has no window focus events; drive TanStack's focus refetching from AppState
// so stale queries refresh when the app returns to the foreground. Only treat
// a transition OUT OF 'background' as a real return-to-foreground — some
// Android OEM skins (MIUI in particular) briefly report 'inactive' when a
// soft keyboard opens/closes, and refetching every active query on every
// keyboard toggle is what "the whole screen jitters while typing" turns out
// to be in practice.
let previousAppState = AppState.currentState;
AppState.addEventListener('change', (status) => {
  const cameFromBackground = previousAppState === 'background';
  previousAppState = status;

  if (status === 'active') {
    if (cameFromBackground) focusManager.setFocused(true);
  } else {
    focusManager.setFocused(false);
  }
});
