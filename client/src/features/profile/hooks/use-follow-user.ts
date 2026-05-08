import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api.ts';
import type { PublicAccountResponse } from '@/types/api.ts';

export function useFollowUser(username: string, accountId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (isFollowing: boolean) => {
      if (isFollowing) {
        await api.delete(`/follow/${accountId}`);
      } else {
        await api.post(`/follow/${accountId}`);
      }
    },
    onMutate: async (isCurrentlyFollowing) => {
      await queryClient.cancelQueries({ queryKey: ['profile', username] });
      const previous = queryClient.getQueryData<PublicAccountResponse>(['profile', username]);

      queryClient.setQueryData<PublicAccountResponse>(['profile', username], (old) => {
        if (!old) return old;
        return {
          ...old,
          isFollowing: !isCurrentlyFollowing,
          followerCount: isCurrentlyFollowing ? old.followerCount - 1 : old.followerCount + 1,
        };
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['profile', username], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', username] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    }
  });
}
