import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { PublicAccountResponse } from '@/types/api';

export function useSuggestions(limit: number = 5) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: ['suggestions', limit],
    queryFn: async () => {
      const { data } = await api.get<PublicAccountResponse[]>('/accounts/suggestions', {
        params: { limit },
      });
      return data;
    },
    staleTime: 1000 * 60 * 5,
    // The endpoint requires auth, and a 403 here is not retried (4xx is excluded
    // from the retry policy), so firing before the token exists leaves the panel
    // permanently empty on a reloaded public route.
    enabled: !!token,
  });
}
