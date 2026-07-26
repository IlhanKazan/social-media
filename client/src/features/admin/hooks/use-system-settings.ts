import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
// Not a component: read the i18next singleton directly rather than the
// useTranslation hook (these run inside mutation callbacks, not render).
import i18n from '@/i18n';

export type SystemSettings = {
  registration_enabled: boolean;
  verified_only_posting: boolean;
  moderation_enabled: boolean;
  bot_enabled: boolean;
  read_only_mode: boolean;
  [key: string]: boolean;
};

export function useSystemSettings() {
  return useQuery({
    queryKey: ['admin', 'system-settings'],
    queryFn: async () => {
      const { data } = await api.get<SystemSettings>('/admin/settings');
      return data;
    },
  });
}

export function useUpdateSystemSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      await api.patch(`/admin/settings/${key}`, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'system-settings'] });
      toast.success(i18n.t('admin.toasts.systemSettingUpdated'));
    },
    onError: () => {
      toast.error(i18n.t('admin.toasts.systemSettingError'));
    }
  });
}
