import { useMutation } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { ChangePasswordRequest } from '@/types/api';

export function useSendVerification() {
  return useMutation({
    mutationFn: async () => {
      await api.post('/accounts/me/email/send-verification');
    },
  });
}

export function useChangePassword() {
  const logout = useAuthStore((s) => s.logout);
  return useMutation({
    mutationFn: async (request: ChangePasswordRequest) => {
      await api.put('/accounts/me/password', request);
    },
    // Password change revokes sessions server-side; force a clean re-login.
    onSuccess: () => {
      void logout();
    },
  });
}

export function useLogoutAll() {
  const logout = useAuthStore((s) => s.logout);
  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout-all');
    },
    onSuccess: () => {
      void logout();
    },
  });
}

export function useDeleteAccount() {
  const logout = useAuthStore((s) => s.logout);
  return useMutation({
    mutationFn: async () => {
      await api.delete('/accounts/me');
    },
    onSuccess: () => {
      void logout();
    },
  });
}
