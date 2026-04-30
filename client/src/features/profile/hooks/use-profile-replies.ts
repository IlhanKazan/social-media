import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useProfileReplies(username: string) {
  return useInfiniteQuery({
    queryKey: ['posts', 'replies', username],
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await api.get(`/posts/by-user/${username}/replies?page=${pageParam}&size=10`);
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.number + 1),
    enabled: !!username,
  });
}
