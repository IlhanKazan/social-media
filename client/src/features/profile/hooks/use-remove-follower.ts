import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function useRemoveFollower() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (followerId: number) => {
      await api.delete(`/follow/remove/${followerId}`);
    },
    onSuccess: () => {
      toast.success('Takipçi başarıyla çıkarıldı');
      queryClient.invalidateQueries({ queryKey: ['follow-list'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      toast.error('Takipçi çıkarılamadı. Lütfen tekrar dene.');
    }
  });
}
