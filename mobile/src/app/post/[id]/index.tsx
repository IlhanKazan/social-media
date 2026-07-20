import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MessageSquare } from 'lucide-react-native';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { PostCard } from '@/components/post-card';
import { useAncestors, usePost, useReplies } from '@/features/posts/queries';
import { useLiveReplies } from '@/features/posts/use-live-replies';

export default function PostDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const postId = Number(params.id);

  const post = usePost(postId);
  const ancestors = useAncestors(postId);
  const replies = useReplies(postId);

  useLiveReplies(postId);

  const replyItems = replies.data?.pages.flatMap((page) => page.content) ?? [];

  if (post.status === 'pending') {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <Stack.Screen options={{ title: 'Gönderi', headerShown: true }} />
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (post.status === 'error' || !post.data) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8 dark:bg-neutral-950">
        <Stack.Screen options={{ title: 'Gönderi', headerShown: true }} />
        <Text className="text-center text-neutral-500">Gönderi yüklenemedi.</Text>
        <Pressable className="mt-4 rounded-full bg-primary px-5 py-2" onPress={() => post.refetch()}>
          <Text className="font-sans-semibold text-white">Tekrar Dene</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <Stack.Screen options={{ title: 'Gönderi', headerShown: true }} />

      <FlatList
        data={replyItems}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <>
            {ancestors.data?.map((ancestor) => (
              <PostCard key={ancestor.id} post={ancestor} />
            ))}
            <PostCard post={post.data} pressable={false} />
            {(post.data.repostCount > 0 || post.data.likeCount > 0 || post.data.viewCount > 0) && (
              <View className="flex-row gap-4 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
                {post.data.repostCount > 0 && (
                  <Pressable
                    className="active:opacity-60"
                    onPress={() => router.push(`/post/${postId}/reposters`)}
                  >
                    <Text className="text-sm text-neutral-700 dark:text-neutral-300">
                      <Text className="font-sans-bold text-neutral-900 dark:text-neutral-50">{post.data.repostCount}</Text> repost
                    </Text>
                  </Pressable>
                )}
                {post.data.likeCount > 0 && (
                  <Pressable
                    className="active:opacity-60"
                    onPress={() => router.push(`/post/${postId}/likers`)}
                  >
                    <Text className="text-sm text-neutral-700 dark:text-neutral-300">
                      <Text className="font-sans-bold text-neutral-900 dark:text-neutral-50">{post.data.likeCount}</Text> beğeni
                    </Text>
                  </Pressable>
                )}
                {post.data.viewCount > 0 && (
                  <Text className="text-sm text-neutral-700 dark:text-neutral-300">
                    <Text className="font-sans-bold text-neutral-900 dark:text-neutral-50">{post.data.viewCount}</Text> görüntülenme
                  </Text>
                )}
              </View>
            )}
            <View className="border-b border-neutral-100 px-4 py-2 dark:border-neutral-800">
              <Text className="text-sm font-sans-bold text-neutral-500">Yanıtlar</Text>
            </View>
          </>
        }
        renderItem={({ item }) => <PostCard post={item} />}
        onEndReached={() => {
          if (replies.hasNextPage && !replies.isFetchingNextPage) {
            void replies.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          replies.status === 'pending' ? (
            <View className="items-center py-8">
              <ActivityIndicator />
            </View>
          ) : (
            <View className="items-center px-8 py-8">
              <Text className="text-center text-neutral-500">Henüz yanıt yok.</Text>
            </View>
          )
        }
        ListFooterComponent={
          replies.isFetchingNextPage ? (
            <View className="items-center py-4">
              <ActivityIndicator />
            </View>
          ) : null
        }
      />

      <Pressable
        className="absolute bottom-6 right-5 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-80"
        onPress={() =>
          router.push({
            pathname: '/compose',
            params: { parentPostId: String(postId), parentAuthor: post.data.author.username },
          })
        }
      >
        <MessageSquare size={24} color="#ffffff" />
      </Pressable>
    </View>
  );
}
