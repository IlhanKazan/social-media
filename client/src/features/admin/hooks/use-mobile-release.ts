import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
// Not a component: read the i18next singleton directly rather than the
// useTranslation hook (these run inside mutation callbacks, not render).
import i18n from '@/i18n';
import type { MobileVersionResponse } from '@/types/api';

export type MobileReleaseInput = {
  latestVersionCode: number;
  latestVersionName: string;
  minSupportedVersionCode: number;
  apkUrl: string;
  apkSha256: string;
  changelogUrl: string;
};

export function useMobileRelease() {
  return useQuery({
    queryKey: ['admin', 'mobile-release'],
    queryFn: async () => {
      const { data } = await api.get<MobileVersionResponse>('/admin/mobile-release');
      return data;
    },
  });
}

export function useUpdateMobileRelease() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (release: MobileReleaseInput) => {
      await api.put('/admin/mobile-release', release);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'mobile-release'] });
      queryClient.invalidateQueries({ queryKey: ['mobile-version'] });
      toast.success(i18n.t('admin.toasts.mobileReleaseUpdated'));
    },
    onError: () => {
      toast.error(i18n.t('admin.toasts.mobileReleaseError'));
    },
  });
}
