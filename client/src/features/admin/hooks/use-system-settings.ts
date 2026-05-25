import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export type SystemSettings = {
  registration_enabled: boolean;
  verified_only_posting: boolean;
  moderation_enabled: boolean;
  bot_enabled: boolean;
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
      toast.success('Sistem ayarı güncellendi.');
    },
    onError: () => {
      toast.error('Ayar güncellenirken bir hata oluştu.');
    }
  });
}
