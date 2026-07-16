import { formatDistanceToNowStrict } from 'date-fns';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BadgeCheck, CornerDownRight, Heart, MessageSquare, Repeat2 } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useAuthStore } from '@/stores/auth-store';
import type { PostResponse, PublicAccountResponse } from '@/types/api';

interface PostCardProps {
  post: PostResponse;
  feedType?: 'POST' | 'REPOST';
  reposter?: PublicAccountResponse;
  pressable?: boolean;
}

function Avatar({ account, size }: { account: PublicAccountResponse; size: number }) {
  if (account.profileImageUrl) {
    return (
      <Image
        source={{ uri: account.profileImageUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      className="items-center justify-center bg-neutral-300 dark:bg-neutral-700"
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <Text className="font-bold text-neutral-700 dark:text-neutral-200" style={{ fontSize: size * 0.4 }}>
        {account.username.substring(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

function CountRow({ post }: { post: PostResponse }) {
  return (
    <View className="mt-2 flex-row items-center gap-8">
      <View className="flex-row items-center gap-1.5">
        <MessageSquare size={17} color="#737373" />
        <Text className="text-sm text-neutral-500">{post.replyCount > 0 ? post.replyCount : ''}</Text>
      </View>
      <View className="flex-row items-center gap-1.5">
        <Repeat2 size={18} color={post.repostedByMe ? '#22c55e' : '#737373'} />
        <Text className={post.repostedByMe ? 'text-sm text-green-500' : 'text-sm text-neutral-500'}>
          {post.repostCount > 0 ? post.repostCount : ''}
        </Text>
      </View>
      <View className="flex-row items-center gap-1.5">
        <Heart
          size={17}
          color={post.likedByMe ? '#f43f5e' : '#737373'}
          fill={post.likedByMe ? '#f43f5e' : 'transparent'}
        />
        <Text className={post.likedByMe ? 'text-sm text-rose-500' : 'text-sm text-neutral-500'}>
          {post.likeCount > 0 ? post.likeCount : ''}
        </Text>
      </View>
    </View>
  );
}

function QuotedPostPreview({ post }: { post: PostResponse }) {
  const router = useRouter();
  return (
    <Pressable
      className="mt-2 rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800"
      onPress={() => router.push(`/post/${post.id}`)}
    >
      <View className="flex-row items-center gap-1.5">
        <Avatar account={post.author} size={20} />
        <Text className="text-sm font-bold text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
          {post.author.displayName || post.author.username}
        </Text>
        <Text className="text-sm text-neutral-500" numberOfLines={1}>
          @{post.author.username}
        </Text>
      </View>
      <Text className="mt-1 text-sm text-neutral-900 dark:text-neutral-50" numberOfLines={3}>
        {post.content}
      </Text>
      {post.imageUrl && (
        <Image
          source={{ uri: post.imageUrl }}
          style={{ width: '100%', height: 140, borderRadius: 12, marginTop: 8 }}
          contentFit="cover"
        />
      )}
    </Pressable>
  );
}

export function PostCard({ post, feedType = 'POST', reposter, pressable = true }: PostCardProps) {
  const router = useRouter();
  const account = useAuthStore((s) => s.account);
  const showReplyContext = !!post.parentPostId && !!post.parentPostAuthorUsername;

  return (
    <Pressable
      className="border-b border-neutral-100 bg-white px-4 py-3 active:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:active:bg-neutral-900"
      onPress={pressable ? () => router.push(`/post/${post.id}`) : undefined}
    >
      {feedType === 'REPOST' && reposter && (
        <View className="mb-1 flex-row items-center gap-1.5 pl-8">
          <Repeat2 size={14} color="#737373" />
          <Text className="text-xs font-bold text-neutral-500">
            {reposter.id === account?.id ? 'You reposted' : `${reposter.displayName || reposter.username} reposted`}
          </Text>
        </View>
      )}

      {showReplyContext && (
        <View className="mb-1 flex-row items-center gap-1.5 pl-8">
          <CornerDownRight size={13} color="#737373" />
          <Text className="text-xs text-neutral-500">Replying to @{post.parentPostAuthorUsername}</Text>
        </View>
      )}

      <View className="flex-row gap-3">
        <Avatar account={post.author} size={40} />

        <View className="min-w-0 flex-1">
          <View className="flex-row flex-wrap items-center gap-x-1.5">
            <Text className="text-[15px] font-bold text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
              {post.author.displayName || post.author.username}
            </Text>
            {post.author.emailVerified && <BadgeCheck size={15} color="#3b82f6" />}
            <Text className="text-sm text-neutral-500" numberOfLines={1}>
              @{post.author.username}
            </Text>
            <Text className="text-sm text-neutral-500">·</Text>
            <Text className="text-sm text-neutral-500">
              {formatDistanceToNowStrict(new Date(post.createdAt))}
            </Text>
            {post.isEdited && <Text className="text-xs italic text-neutral-500">(edited)</Text>}
          </View>

          <Text className="mt-0.5 text-[15px] leading-5 text-neutral-900 dark:text-neutral-50">
            {post.content}
          </Text>

          {post.imageUrl && (
            <Image
              source={{ uri: post.imageUrl }}
              style={{ width: '100%', height: 220, borderRadius: 16, marginTop: 8 }}
              contentFit="cover"
            />
          )}

          {post.quotedPost && <QuotedPostPreview post={post.quotedPost} />}

          <CountRow post={post} />
        </View>
      </View>
    </Pressable>
  );
}
