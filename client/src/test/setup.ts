import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './server';
import { useAuthStore } from '@/stores/auth-store';
import i18n from '@/i18n';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeAll(() => i18n.changeLanguage('tr'));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  useAuthStore.setState({ token: null, account: null });
  localStorage.clear();
});

afterAll(() => server.close());
