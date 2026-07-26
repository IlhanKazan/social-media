import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
// Not a component: read the i18next singleton directly rather than the
// useTranslation hook (these run inside mutation callbacks, not render).
import i18n from '@/i18n';

export function useCaches() {
  return useQuery({
    queryKey: ['admin', 'caches'],
    queryFn: async () => {
      const { data } = await api.get<string[]>('/admin/ops/caches');
      return data;
    },
  });
}

export function useInvalidateCache() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name?: string) => {
      await api.post('/admin/ops/caches/invalidate', name ? { name } : {});
    },
    onSuccess: (_data, name) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'caches'] });
      toast.success(name ? i18n.t('admin.toasts.cacheCleared', { name }) : i18n.t('admin.toasts.allCachesCleared'));
    },
    onError: () => toast.error(i18n.t('admin.toasts.cacheClearError')),
  });
}

export function useResetRateLimits() {
  return useMutation({
    mutationFn: async () => {
      await api.post('/admin/ops/rate-limits/reset');
    },
    onSuccess: () => toast.success(i18n.t('admin.toasts.rateLimitsReset')),
    onError: () => toast.error(i18n.t('admin.toasts.rateLimitResetError')),
  });
}
