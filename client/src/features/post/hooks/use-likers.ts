import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PageResponse, PublicAccountResponse } from '@/types/api';

export function useLikers(postId: number, isOpen: boolean) {
  return useInfiniteQuery<PageResponse<PublicAccountResponse>>({
    queryKey: ['post', postId, 'likers'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await api.get<PageResponse<PublicAccountResponse>>(
        `/posts/${postId}/interactions/likers`,
        { params: { page: pageParam, size: 20 } }
      );
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
    enabled: isOpen && !!postId,
  });
}
