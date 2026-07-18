import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { ChangePasswordRequest, NotificationPreferences } from '@/types/api';

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: async () => {
      const { data } = await api.get<NotificationPreferences>('/notifications/preferences');
      return data;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: NotificationPreferences) => {
      const { data } = await api.put<NotificationPreferences>('/notifications/preferences', prefs);
      return data;
    },
    onSuccess: (data) => queryClient.setQueryData(['notification-preferences'], data),
  });
}

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
