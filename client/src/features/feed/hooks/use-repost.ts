import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function useRepost() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (postId: number) => {
      await api.post(`/posts/${postId}/repost`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['profile-feed'] });
      toast.success(t('feed.repostSuccess'));
    }
  });
}
