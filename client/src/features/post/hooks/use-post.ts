import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PageResponse, PostResponse } from '@/types/api';

export function usePost(id: number) {
  return useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const { data } = await api.get<PostResponse>(`/posts/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function usePostAncestors(postId: number) {
  return useQuery({
    queryKey: ['post', postId, 'ancestors'],
    queryFn: async () => {
      const { data } = await api.get<PostResponse[]>(`/posts/${postId}/ancestors`);
      return data;
    },
    enabled: !!postId,
  });
}

export function usePostReplies(postId: number) {
  return useInfiniteQuery<PageResponse<PostResponse>>({
    queryKey: ['post', postId, 'replies'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await api.get<PageResponse<PostResponse>>(`/posts/${postId}/replies`, {
        params: { page: pageParam, size: 20 },
      });
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
    enabled: !!postId,
  });
}
