import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';

export interface Audience {
  readonly recipients: number;
  readonly sentThisMonth: number;
  readonly monthlyCap: number;
  readonly remaining: number;
}

export interface AnnouncementInput {
  readonly title: string;
  readonly message: string;
  readonly linkUrl: string;
  /** Echoes the recipient count the admin was shown; the server rejects a mismatch. */
  readonly confirm: number;
}

export function useAnnouncementAudience() {
  return useQuery<Audience>({
    queryKey: ['admin', 'announcement-audience'],
    queryFn: async () => {
      const { data } = await api.get<Audience>('/admin/announcements/audience');
      return data;
    },
    // Never served from cache: the count is the safety check on a mass send, so
    // a stale number here is the one thing that must not happen.
    staleTime: 0,
    gcTime: 0,
  });
}

export function useSendAnnouncement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AnnouncementInput) => {
      const { data } = await api.post<{ queued: number }>('/admin/announcements', input);
      return data;
    },
    onSuccess: (data) => {
      toast.success(t('admin.announcements.queued', { count: data.queued }));
      void queryClient.invalidateQueries({ queryKey: ['admin', 'announcement-audience'] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(t, error, 'admin.announcements.sendError'));
    },
  });
}
