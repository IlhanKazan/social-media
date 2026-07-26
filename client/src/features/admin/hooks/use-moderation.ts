import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { PageResponse, PostResponse } from '@/types/api';
// Not a component: read the i18next singleton directly rather than the
// useTranslation hook (these run inside mutation callbacks, not render).
import i18n from '@/i18n';

export function useModerationQueue() {
  return useInfiniteQuery<PageResponse<PostResponse>>({
    queryKey: ['admin', 'moderation-queue'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await api.get<PageResponse<PostResponse>>('/admin/moderation-queue', {
        params: { page: pageParam, size: 10 },
      });
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
  });
}

export function useModerationActions() {
  const queryClient = useQueryClient();

  const approve = useMutation({
    mutationFn: (postId: number) => api.post(`/admin/posts/${postId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'moderation-queue'] });
      toast.success(i18n.t('admin.toasts.postApproved'));
    }
  });

  const remove = useMutation({
    mutationFn: (postId: number) => api.post(`/admin/posts/${postId}/remove`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'moderation-queue'] });
      toast.error(i18n.t('admin.toasts.postRemoved'));
    }
  });

  return { approve, remove };
}
