import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './server';
import { useAuthStore } from '@/stores/auth-store';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  useAuthStore.setState({ token: null, account: null });
  localStorage.clear();
});

afterAll(() => server.close());
