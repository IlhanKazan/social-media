import { describe, it, expect } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/utils';
import { server } from '@/test/server';
import { useAuthStore } from '@/stores/auth-store';
import { LoginPage } from './LoginPage';

const LOGIN_URL = 'http://localhost:8080/api/v1/auth/login';

describe('LoginPage', () => {
  it('shows Zod validation errors when submitting empty fields', async () => {
    renderWithProviders(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Giriş Yap' }));

    expect(await screen.findByText('Username or Email is required')).toBeInTheDocument();
    expect(await screen.findByText('Password is required')).toBeInTheDocument();
  });

  it('stores the token after a successful login', async () => {
    server.use(
      http.post(LOGIN_URL, () =>
        HttpResponse.json({
          accessToken: 'token-xyz',
          account: {
            id: 1,
            username: 'neo',
            displayName: 'Neo',
            email: 'neo@example.com',
          },
        })
      )
    );

    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Kullanıcı Adı veya E-posta'), {
      target: { value: 'neo' },
    });
    fireEvent.change(screen.getByLabelText('Şifre'), {
      target: { value: 'Password123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Giriş Yap' }));

    await waitFor(() => expect(useAuthStore.getState().token).toBe('token-xyz'));
  });
});
