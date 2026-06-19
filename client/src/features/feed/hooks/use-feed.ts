import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { PageResponse, PostResponse } from '@/types/api';

export function useFeed() {
  const token = useAuthStore((state) => state.token);
  return useInfiniteQuery<PageResponse<PostResponse>>({
    queryKey: ['feed'],
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await api.get<PageResponse<PostResponse>>('/posts/feed', {
        params: { page: pageParam, size: 20 },
      });
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.last) return undefined;
      return lastPage.page + 1;
    },
    enabled: !!token,
  });
}
