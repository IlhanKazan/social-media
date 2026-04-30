import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { PageResponse, PostResponse } from '@/types/api.ts';

export function useProfileFeed(username: string) {
  return useInfiniteQuery<PageResponse<PostResponse>>({
    queryKey: ['profile-feed', username],
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await api.get<PageResponse<PostResponse>>(`/posts/by-user/${username}`, {
        params: { page: pageParam, size: 20 },
      });
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.last) return undefined;
      return lastPage.page + 1;
    },
    enabled: !!username,
  });
}
