import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BadgeCheck, CornerDownRight, Heart, MessageSquare, MoreHorizontal, Pencil, Quote, Repeat2, Send, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ActionSheet } from '@/components/action-sheet';
import { MentionText } from '@/components/mention-text';
import { ShareToDmSheet } from '@/components/share-to-dm-sheet';
import { useDeletePost, useToggleLike, useToggleRepost } from '@/features/posts/queries';
import { useNow } from '@/hooks/use-now';
import { formatShortRelativeTime } from '@/lib/relative-time';
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
      <Text className="font-sans-bold text-neutral-700 dark:text-neutral-200" style={{ fontSize: size * 0.4 }}>
        {account.username.substring(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

function ActionRow({ post }: { post: PostResponse }) {
  const router = useRouter();
  const toggleLike = useToggleLike();
  const toggleRepost = useToggleRepost();
  const [repostSheetOpen, setRepostSheetOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <View className="mt-2.5 flex-row items-center gap-10">
      <ActionSheet
        visible={repostSheetOpen}
        onClose={() => setRepostSheetOpen(false)}
        options={[
          {
            label: post.repostedByMe ? 'Repostu Geri Al' : 'Repost',
            icon: Repeat2,
            onPress: () => toggleRepost.mutate(post.id),
          },
          {
            label: 'Alıntıla',
            icon: Quote,
            onPress: () =>
              router.push({
                pathname: '/compose',
                params: {
                  quotePostId: String(post.id),
                  quoteAuthor: post.author.displayName || post.author.username,
                  quoteContent: post.content.slice(0, 120),
                },
              }),
          },
          {
            label: 'Mesajla Paylaş',
            icon: Send,
            onPress: () => setShareOpen(true),
          },
        ]}
      />

      <ShareToDmSheet visible={shareOpen} onClose={() => setShareOpen(false)} postId={post.id} />
      <Pressable
        className="flex-row items-center gap-1.5 active:opacity-60"
        hitSlop={10}
        onPress={() =>
          router.push({
            pathname: '/compose',
            params: { parentPostId: String(post.id), parentAuthor: post.author.username },
          })
        }
      >
        <MessageSquare size={17} color="#737373" />
        <Text className="text-sm text-neutral-500">{post.replyCount > 0 ? post.replyCount : ''}</Text>
      </Pressable>

      <Pressable
        className="flex-row items-center gap-1.5 active:opacity-60"
        hitSlop={10}
        onPress={() => setRepostSheetOpen(true)}
        disabled={toggleRepost.isPending}
      >
        <Repeat2 size={18} color={post.repostedByMe ? '#22c55e' : '#737373'} />
        <Text className={post.repostedByMe ? 'text-sm font-sans-semibold text-green-500' : 'text-sm text-neutral-500'}>
          {post.repostCount > 0 ? post.repostCount : ''}
        </Text>
      </Pressable>

      <Pressable
        className="flex-row items-center gap-1.5 active:opacity-60"
        hitSlop={10}
        onPress={() => toggleLike.mutate(post.id)}
        disabled={toggleLike.isPending}
      >
        <Heart
          size={17}
          color={post.likedByMe ? '#f43f5e' : '#737373'}
          fill={post.likedByMe ? '#f43f5e' : 'transparent'}
        />
        <Text className={post.likedByMe ? 'text-sm font-sans-semibold text-rose-500' : 'text-sm text-neutral-500'}>
          {post.likeCount > 0 ? post.likeCount : ''}
        </Text>
      </Pressable>
    </View>
  );
}

function QuotedPostPreview({ post }: { post: PostResponse }) {
  const router = useRouter();
  return (
    <Pressable
      className="mt-2 rounded-2xl border border-neutral-200 p-3 active:bg-neutral-50 dark:border-neutral-800 dark:active:bg-neutral-900"
      onPress={() => router.push(`/post/${post.id}`)}
    >
      <View className="flex-row items-center gap-1.5">
        <Avatar account={post.author} size={20} />
        <Text className="text-sm font-sans-bold text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
          {post.author.displayName || post.author.username}
        </Text>
        <Text className="text-sm text-neutral-500" numberOfLines={1}>
          @{post.author.username}
        </Text>
      </View>
      <MentionText
        className="mt-1 text-sm text-neutral-900 dark:text-neutral-50"
        text={post.content}
        numberOfLines={3}
      />
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
  const deletePost = useDeletePost();
  const showReplyContext = !!post.parentPostId && !!post.parentPostAuthorUsername;
  const [ownSheetOpen, setOwnSheetOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const now = useNow();

  return (
    <Pressable
      className="border-b border-neutral-100 bg-white px-4 py-3 active:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950 dark:active:bg-neutral-900"
      onPress={pressable ? () => router.push(`/post/${post.id}`) : undefined}
    >
      {feedType === 'REPOST' && reposter && (
        <View className="mb-1 flex-row items-center gap-1.5 pl-8">
          <Repeat2 size={14} color="#737373" />
          <Text className="text-[13px] font-sans-bold text-neutral-500">
            {reposter.id === account?.id ? 'Sen paylaştın' : `${reposter.displayName || reposter.username} paylaştı`}
          </Text>
        </View>
      )}

      {showReplyContext && (
        <View className="mb-1 flex-row items-center gap-1.5 pl-8">
          <CornerDownRight size={13} color="#737373" />
          <Text className="text-[13px] text-neutral-500">@{post.parentPostAuthorUsername} kullanıcısına yanıt</Text>
        </View>
      )}

      <View className="flex-row gap-3">
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            router.push(`/user/${post.author.username}`);
          }}
        >
          <Avatar account={post.author} size={40} />
        </Pressable>

        <View className="min-w-0 flex-1">
          <View className="flex-row items-start">
            <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-x-1.5">
              <Pressable
                className="flex-row items-center gap-x-1.5"
                onPress={(e) => {
                  e.stopPropagation();
                  router.push(`/user/${post.author.username}`);
                }}
              >
                <Text className="text-[16px] font-sans-bold text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
                  {post.author.displayName || post.author.username}
                </Text>
                {post.author.emailVerified && <BadgeCheck size={16} color="#3b82f6" />}
                <Text className="text-[15px] text-neutral-500" numberOfLines={1}>
                  @{post.author.username}
                </Text>
              </Pressable>
              <Text className="text-[15px] text-neutral-500">·</Text>
              <Text className="text-[15px] text-neutral-500">
                {formatShortRelativeTime(post.createdAt, now)}
              </Text>
              {post.isEdited && <Text className="text-[13px] italic text-neutral-500">(düzenlendi)</Text>}
            </View>

            {account?.id === post.author.id && post.moderationStatus === 'FLAGGED' && (
              <View className="mr-1 rounded-md bg-red-500 px-1.5 py-0.5">
                <Text className="text-[10px] font-sans-bold text-white">İhlal: Gizlendi</Text>
              </View>
            )}

            {account?.id === post.author.id && (
              <Pressable
                hitSlop={8}
                className="-mt-1 h-8 w-8 items-center justify-center rounded-full active:bg-neutral-100 dark:active:bg-neutral-900"
                onPress={(e) => {
                  e.stopPropagation();
                  setOwnSheetOpen(true);
                }}
              >
                <MoreHorizontal size={18} color="#71767b" />
              </Pressable>
            )}
          </View>

          <MentionText
            className="mt-0.5 text-[16px] leading-[22px] text-neutral-900 dark:text-neutral-50"
            text={post.content}
          />

          {post.imageUrl && (
            <Image
              source={{ uri: post.imageUrl }}
              style={{ width: '100%', height: 220, borderRadius: 16, marginTop: 8 }}
              contentFit="cover"
            />
          )}

          {post.quotedPost && <QuotedPostPreview post={post.quotedPost} />}

          <ActionRow post={post} />
        </View>
      </View>

      <ActionSheet
        visible={ownSheetOpen}
        onClose={() => setOwnSheetOpen(false)}
        options={[
          {
            label: 'Düzenle',
            icon: Pencil,
            onPress: () =>
              router.push({
                pathname: '/compose',
                params: {
                  editPostId: String(post.id),
                  initialContent: post.content,
                  ...(post.imageUrl ? { editImageUrl: post.imageUrl } : {}),
                },
              }),
          },
          {
            label: 'Sil',
            icon: Trash2,
            destructive: true,
            onPress: () => setDeleteConfirmOpen(true),
          },
        ]}
      />

      <ActionSheet
        visible={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Gönderi silinsin mi? Bu işlem geri alınamaz."
        options={[
          {
            label: 'Gönderiyi Sil',
            icon: Trash2,
            destructive: true,
            onPress: () => deletePost.mutate(post.id),
          },
        ]}
      />
    </Pressable>
  );
}
