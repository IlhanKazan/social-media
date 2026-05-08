import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PublicAccountResponse } from '@/types/api';

export function useSuggestions(limit: number = 5) {
  return useQuery({
    queryKey: ['suggestions', limit],
    queryFn: async () => {
      const { data } = await api.get<PublicAccountResponse[]>('/accounts/suggestions', {
        params: { limit },
      });
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}
