import { describe, it, expect } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { renderWithProviders } from '@/test/utils';
import { server } from '@/test/server';
import { useAuthStore } from '@/stores/auth-store';
import { LoginPage } from './LoginPage';

const LOGIN_URL = 'http://localhost:8080/api/v1/auth/login';

describe('LoginPage', () => {
  it('reveals the password field once an identifier is entered', async () => {
    renderWithProviders(<LoginPage />);

    // The form opens on a single field, so the password is not yet in the DOM.
    expect(screen.queryByLabelText('Şifre')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Kullanıcı Adı veya E-posta'), {
      target: { value: 'neo' },
    });

    expect(await screen.findByLabelText('Şifre')).toBeInTheDocument();
  });

  it('shows a validation error when submitting an empty form', async () => {
    renderWithProviders(<LoginPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Giriş Yap' }));

    expect(await screen.findByText('Kullanıcı adı veya e-posta gerekli')).toBeInTheDocument();
    // Only the visible step is reported. Complaining about a field the user has
    // not been shown yet would be confusing, and the submit is blocked anyway.
    expect(screen.queryByText('Şifre gerekli')).not.toBeInTheDocument();
  });

  it('validates the password once it is on screen', async () => {
    renderWithProviders(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Kullanıcı Adı veya E-posta'), {
      target: { value: 'neo' },
    });
    await screen.findByLabelText('Şifre');

    fireEvent.click(screen.getByRole('button', { name: 'Giriş Yap' }));

    expect(await screen.findByText('Şifre gerekli')).toBeInTheDocument();
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
    fireEvent.change(await screen.findByLabelText('Şifre'), {
      target: { value: 'Password123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Giriş Yap' }));

    await waitFor(() => expect(useAuthStore.getState().token).toBe('token-xyz'));
  });
});
