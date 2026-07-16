import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import type {
  CreatePostRequest,
  FeedItemResponse,
  PageResponse,
  PostResponse,
} from '@/types/api';

const PAGE_SIZE = 20;

function usePagedPosts<T>(key: (string | number)[], url: string) {
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
  });
}

export function useFeed() {
  return usePagedPosts<FeedItemResponse>(['feed'], '/posts/feed');
}

export function useExplore() {
  return usePagedPosts<PostResponse>(['explore'], '/posts/explore');
}

export function usePost(postId: number) {
  return useQuery<PostResponse>({
    queryKey: ['post', postId],
    queryFn: async () => {
      const { data } = await api.get<PostResponse>(`/posts/${postId}`);
      return data;
    },
    enabled: Number.isFinite(postId),
  });
}

export function useAncestors(postId: number) {
  return useQuery<PostResponse[]>({
    queryKey: ['post', postId, 'ancestors'],
    queryFn: async () => {
      const { data } = await api.get<PostResponse[]>(`/posts/${postId}/ancestors`);
      return data;
    },
    enabled: Number.isFinite(postId),
  });
}

export function useReplies(postId: number) {
  return usePagedPosts<PostResponse>(['post', postId, 'replies'], `/posts/${postId}/replies`);
}

export async function uploadPostImage(uri: string): Promise<string> {
  const filename = uri.split('/').pop() ?? 'photo.jpg';
  const extension = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeType = extension === 'png' ? 'image/png'
    : extension === 'webp' ? 'image/webp'
    : extension === 'gif' ? 'image/gif'
    : 'image/jpeg';

  const formData = new FormData();
  // RN's FormData takes a { uri, name, type } descriptor instead of a Blob.
  formData.append('file', { uri, name: filename, type: mimeType } as unknown as Blob);

  const { data } = await api.post<{ url: string }>('/posts/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.url;
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: CreatePostRequest) => {
      const { data } = await api.post<PostResponse>('/posts', request);
      return data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['explore'] });
      if (variables.parentPostId) {
        void queryClient.invalidateQueries({ queryKey: ['post', variables.parentPostId] });
      }
    },
  });
}
