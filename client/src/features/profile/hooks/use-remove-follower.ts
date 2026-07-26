import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function useRemoveFollower() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (followerId: number) => {
      await api.delete(`/follow/remove/${followerId}`);
    },
    onSuccess: () => {
      toast.success(t('profile.removeFollowerSuccess'));
      queryClient.invalidateQueries({ queryKey: ['follow-list'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      toast.error(t('profile.removeFollowerError'));
    }
  });
}
