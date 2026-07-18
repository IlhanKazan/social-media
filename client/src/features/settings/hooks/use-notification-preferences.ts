import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { NotificationPreferences, ErrorResponse } from '@/types/api';

type ApiError = AxiosError<ErrorResponse>;

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
    onError: (e: ApiError) => toast.error(e.response?.data?.message || 'Tercihler güncellenemedi.'),
  });
}
