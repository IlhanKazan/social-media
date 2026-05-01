import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useProfileLikes(username: string) {
  return useInfiniteQuery({
    queryKey: ['posts', 'likes', username],
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await api.get(`/posts/by-user/${username}/likes?page=${pageParam}&size=10`);
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
    enabled: !!username,
  });
}
