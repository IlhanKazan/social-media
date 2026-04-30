import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { PublicAccountResponse } from '@/types/api.ts';

export function useProfile(username: string) {
  return useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data } = await api.get<PublicAccountResponse>(`/accounts/${username}`);
      return data;
    },
    enabled: !!username,
  });
}
