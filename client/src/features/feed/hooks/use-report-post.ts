import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { ReportPostInput } from '../schemas';

export function useReportPost(postId: number) {
  return useMutation({
    mutationFn: async (data: ReportPostInput) => {
      await api.post(`/posts/${postId}/report`, data);
    },
    onSuccess: () => {
      toast.success('Raporunuz alındı', {
        description: 'Bildiriminiz incelenmek üzere ekibimize iletildi.',
      });
    },
    onError: (error: any) => {
      if (error.response?.status === 429) {
        toast.error('Çok fazla istek', {
          description: 'Lütfen daha sonra tekrar deneyin.',
        });
      } else {
        toast.error('Hata', {
          description: 'Rapor gönderilirken bir sorun oluştu.',
        });
      }
    }
  });
}
