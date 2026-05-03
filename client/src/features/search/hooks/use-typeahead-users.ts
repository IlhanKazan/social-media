import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PageResponse, PublicAccountResponse } from '@/types/api';

export function useTypeaheadUsers(query: string) {
  return useQuery({
    queryKey: ['typeahead-users', query],
    queryFn: async () => {
      const { data } = await api.get<PageResponse<PublicAccountResponse>>('/search/users', {
        params: { q: query, page: 0, size: 5 },
      });
      return data.content;
    },
    enabled: query.trim().length > 0,
    staleTime: 1000 * 60,
  });
}
