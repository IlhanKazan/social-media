import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

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
      toast.success(name ? `'${name}' önbelleği temizlendi.` : 'Tüm önbellekler temizlendi.');
    },
    onError: () => toast.error('Önbellek temizlenirken bir hata oluştu.'),
  });
}

export function useResetRateLimits() {
  return useMutation({
    mutationFn: async () => {
      await api.post('/admin/ops/rate-limits/reset');
    },
    onSuccess: () => toast.success('Rate-limit sayaçları sıfırlandı.'),
    onError: () => toast.error('Rate-limit sıfırlanırken bir hata oluştu.'),
  });
}
