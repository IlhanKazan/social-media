import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import type { CombinedSearchResponse } from '@/types/api';

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      const { data } = await api.get<CombinedSearchResponse>('/search', {
        params: { q: query },
      });
      return data;
    },
    enabled: query.trim().length > 0,
  });
}
