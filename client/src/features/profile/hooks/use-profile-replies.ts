import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useProfileReplies(username: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['posts', 'replies', username],
    queryFn: async ({ pageParam = 0 }) => {
      const { data } = await api.get(`/posts/by-user/${username}/replies?page=${pageParam}&size=10`);
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
    // Gated on the tab being open: all three profile lists used to fetch and
    // render on mount, so a profile paid for sixty cards to show twenty.
    enabled: !!username && enabled,
  });
}
