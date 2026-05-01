import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PageResponse, PostResponse } from '@/types/api';

export function useExploreFeed() {
  return useInfiniteQuery<PageResponse<PostResponse>>({
    queryKey: ['explore'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await api.get<PageResponse<PostResponse>>('/posts/explore', {
        params: { page: pageParam, size: 20 },
      });
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.last) return undefined;
      return lastPage.page + 1;
    },
  });
}