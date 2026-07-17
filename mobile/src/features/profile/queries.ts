import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import type {
  FeedItemResponse,
  MyAccountResponse,
  PageResponse,
  PostResponse,
  PublicAccountResponse,
  UpdateProfileRequest,
} from '@/types/api';

const PAGE_SIZE = 20;

function usePagedProfile<T>(key: (string | number)[], url: string, enabled = true) {
  return useInfiniteQuery<PageResponse<T>>({
    queryKey: key,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<PageResponse<T>>(url, {
        params: { page: pageParam, size: PAGE_SIZE },
      });
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
    enabled,
  });
}

export function useProfile(username: string | undefined) {
  return useQuery<PublicAccountResponse>({
    queryKey: ['profile', username],
    queryFn: async () => {
      const { data } = await api.get<PublicAccountResponse>(`/accounts/${username}`);
      return data;
    },
    enabled: !!username,
  });
}

export function useProfilePosts(username: string | undefined) {
  return usePagedProfile<FeedItemResponse>(
    ['profile', username ?? '', 'posts'],
    `/posts/by-user/${username}`,
    !!username
  );
}

export function useProfileReplies(username: string | undefined) {
  return usePagedProfile<PostResponse>(
    ['profile', username ?? '', 'replies'],
    `/posts/by-user/${username}/replies`,
    !!username
  );
}

export function useProfileLikes(username: string | undefined) {
  return usePagedProfile<PostResponse>(
    ['profile', username ?? '', 'likes'],
    `/posts/by-user/${username}/likes`,
    !!username
  );
}

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
      queryClient.setQueryData<PublicAccountResponse>(['profile', username], (old) =>
        old
          ? {
              ...old,
              isFollowing: !isCurrentlyFollowing,
              followerCount: isCurrentlyFollowing ? old.followerCount - 1 : old.followerCount + 1,
            }
          : old
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['profile', username], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile', username] });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useFollowList(accountId: number | undefined, type: 'followers' | 'following') {
  return usePagedProfile<PublicAccountResponse>(
    ['follow-list', accountId ?? 0, type],
    `/follow/${type}/${accountId}`,
    !!accountId
  );
}

export function useMe() {
  return useQuery<MyAccountResponse>({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get<MyAccountResponse>('/accounts/me');
      return data;
    },
  });
}

async function uploadImage(uri: string, endpoint: string): Promise<string> {
  const filename = uri.split('/').pop() ?? 'photo.jpg';
  const extension = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = extension === 'png' ? 'image/png'
    : extension === 'webp' ? 'image/webp'
    : extension === 'gif' ? 'image/gif'
    : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', { uri, name: filename, type: mimeType } as unknown as Blob);

  // These endpoints return the raw secure URL as a plain string, not { url }.
  const { data } = await api.post<string>(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export const uploadAvatar = (uri: string) => uploadImage(uri, '/accounts/me/avatar');
export const uploadCover = (uri: string) => uploadImage(uri, '/accounts/me/cover');

export function useUpdateProfile(username: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: UpdateProfileRequest) => {
      const { data } = await api.patch<MyAccountResponse>('/accounts/me', request);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me'] });
      void queryClient.invalidateQueries({ queryKey: ['profile', username] });
    },
  });
}
