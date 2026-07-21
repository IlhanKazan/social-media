import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useDebounce } from '@/hooks/use-debounce';
import type { PublicAccountResponse } from '@/types/api';

export function useMentionSuggestions(prefix: string) {
  const debouncedPrefix = useDebounce(prefix, 250);

  return useQuery<PublicAccountResponse[]>({
    queryKey: ['mention-suggestions', debouncedPrefix],
    queryFn: async () => {
      const { data } = await api.get<PublicAccountResponse[]>('/accounts/mention-suggestions', {
        params: { prefix: debouncedPrefix, limit: 6 },
      });
      return data;
    },
    enabled: debouncedPrefix.length > 0,
  });
}
