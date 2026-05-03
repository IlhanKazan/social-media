import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PostResponse } from '@/types/api';

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
