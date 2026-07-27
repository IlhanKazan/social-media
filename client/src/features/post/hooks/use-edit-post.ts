import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { PostResponse, UpdatePostRequest } from '@/types/api';

export function useEditPost(postId: number) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: UpdatePostRequest) => {
      const res = await api.patch<PostResponse>(`/posts/${postId}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success(t('post.editDialog.updateSuccess'));
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['explore'] });
      queryClient.invalidateQueries({ queryKey: ['profile-feed'] });
      queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
    onError: () => {
      toast.error(t('post.editDialog.updateError'));
    }
  });
}
