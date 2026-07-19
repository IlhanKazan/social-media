import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';

import { api } from '@/lib/api';
import type {
  CreatePostRequest,
  CreateQuoteRepostRequest,
  FeedItemResponse,
  PageResponse,
  PostResponse,
  PublicAccountResponse,
  UpdatePostRequest,
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

export function useLikers(postId: number) {
  return usePagedPosts<PublicAccountResponse>(
    ['post', postId, 'likers'],
    `/posts/${postId}/interactions/likers`
  );
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, request }: { postId: number; request: UpdatePostRequest }) => {
      const { data } = await api.patch<PostResponse>(`/posts/${postId}`, request);
      return data;
    },
    onSuccess: (_data, { postId }) => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['explore'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      void queryClient.invalidateQueries({ queryKey: ['post', postId] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: number) => {
      await api.delete(`/posts/${postId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['explore'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
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

const isPostListQuery = (queryKey: readonly unknown[]) =>
  queryKey[0] === 'feed' || queryKey[0] === 'explore' || queryKey[0] === 'post';

type ListItem = PostResponse | FeedItemResponse;

function applyToItem(item: ListItem, postId: number, updater: (p: PostResponse) => PostResponse): ListItem {
  if ('post' in item) {
    return item.post.id === postId ? { ...item, post: updater(item.post) } : item;
  }
  return item.id === postId ? updater(item) : item;
}

// Walks every cached shape a post can live in: infinite feed/explore/replies
// pages, the ancestors array, and the single post detail entry.
function updatePostInCaches(
  queryClient: QueryClient,
  postId: number,
  updater: (p: PostResponse) => PostResponse
) {
  queryClient.setQueriesData<unknown>(
    { predicate: (query) => isPostListQuery(query.queryKey) },
    (old: unknown) => {
      if (!old) return old;
      if (Array.isArray(old)) {
        return (old as PostResponse[]).map((p) => (p.id === postId ? updater(p) : p));
      }
      if (typeof old === 'object' && 'pages' in old) {
        const data = old as { pages: PageResponse<ListItem>[]; pageParams: unknown[] };
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            content: page.content.map((item) => applyToItem(item, postId, updater)),
          })),
        };
      }
      const post = old as PostResponse;
      return post.id === postId ? updater(post) : post;
    }
  );
}

function invalidatePostLists(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ predicate: (query) => isPostListQuery(query.queryKey) });
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: number) => {
      await api.post(`/posts/${postId}/interactions/like`);
    },
    onMutate: (postId) => {
      updatePostInCaches(queryClient, postId, (p) => ({
        ...p,
        likedByMe: !p.likedByMe,
        likeCount: p.likedByMe ? Math.max(0, p.likeCount - 1) : p.likeCount + 1,
      }));
    },
    onError: () => invalidatePostLists(queryClient),
  });
}

export function useToggleRepost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: number) => {
      await api.post(`/posts/${postId}/repost`);
    },
    onMutate: (postId) => {
      updatePostInCaches(queryClient, postId, (p) => ({
        ...p,
        repostedByMe: !p.repostedByMe,
        repostCount: p.repostedByMe ? Math.max(0, p.repostCount - 1) : p.repostCount + 1,
      }));
    },
    onSettled: () => invalidatePostLists(queryClient),
  });
}

export function useQuoteRepost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: CreateQuoteRepostRequest) => {
      const { data } = await api.post<PostResponse>(
        `/posts/${request.quotedPostId}/quote-repost`,
        request
      );
      return data;
    },
    onSuccess: () => invalidatePostLists(queryClient),
  });
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
