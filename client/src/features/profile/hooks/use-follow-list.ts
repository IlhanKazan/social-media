import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PageResponse, PublicAccountResponse } from '@/types/api';

export function useFollowList(accountId: number, type: 'followers' | 'following', isOpen: boolean) {
  return useInfiniteQuery<PageResponse<PublicAccountResponse>>({
    queryKey: ['follow-list', accountId, type],
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await api.get<PageResponse<PublicAccountResponse>>(`/follow/${type}/${accountId}`, {
        params: { page: pageParam, size: 20 },
      });
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
    enabled: isOpen && !!accountId,
  });
}
