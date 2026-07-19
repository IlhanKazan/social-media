import { format } from 'date-fns';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BadgeCheck, CalendarDays, Mail, Settings } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { PostCard } from '@/components/post-card';
import { ThemedRefreshControl } from '@/components/themed-refresh';
import {
  useFollowUser,
  useProfile,
  useProfileLikes,
  useProfilePosts,
  useProfileReplies,
} from '@/features/profile/queries';
import { useStartConversation } from '@/features/messaging/queries';
import { useAuthStore } from '@/stores/auth-store';
import type { FeedItemResponse, PostResponse, PublicAccountResponse } from '@/types/api';

type Tab = 'posts' | 'replies' | 'likes';

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
      <Text className="font-sans-bold text-neutral-700 dark:text-neutral-200" style={{ fontSize: size * 0.35 }}>
        {account.username.substring(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

function ProfileHeader({
  profile,
  isOwn,
  activeTab,
  onTabChange,
}: {
  profile: PublicAccountResponse;
  isOwn: boolean;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) {
  const router = useRouter();
  const followUser = useFollowUser(profile.username, profile.id);
  const startConversation = useStartConversation();

  return (
    <View>
      <View className="h-36 w-full bg-neutral-200 dark:bg-neutral-800">
        {profile.coverImageUrl && (
          <Image
            source={{ uri: profile.coverImageUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            contentPosition={{ top: `${profile.coverPosition}%`, left: '50%' }}
          />
        )}
      </View>

      <View className="px-4 pb-3">
        <View className="flex-row items-start justify-between">
          <View className="-mt-10 rounded-full border-4 border-white dark:border-neutral-950">
            <Avatar account={profile} size={80} />
          </View>

          <View className="flex-row items-center gap-2 pt-3">
            {isOwn ? (
              <>
                <Pressable
                  className="h-10 w-10 items-center justify-center rounded-full border border-neutral-300 active:opacity-70 dark:border-neutral-700"
                  onPress={() => router.push('/settings')}
                >
                  <Settings size={18} color="#737373" />
                </Pressable>
                <Pressable
                  className="rounded-full border border-neutral-300 px-5 py-2 active:opacity-70 dark:border-neutral-700"
                  onPress={() => router.push('/edit-profile')}
                >
                  <Text className="font-sans-bold text-neutral-900 dark:text-neutral-50">Profili Düzenle</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  className="h-10 w-10 items-center justify-center rounded-full border border-neutral-300 active:opacity-70 dark:border-neutral-700"
                  onPress={() => startConversation.mutate(profile.id)}
                  disabled={startConversation.isPending}
                >
                  {startConversation.isPending ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <Mail size={18} color="#737373" />
                  )}
                </Pressable>
                <Pressable
                  className={
                    profile.isFollowing
                      ? 'rounded-full border border-neutral-300 px-5 py-2 active:opacity-70 dark:border-neutral-700'
                      : 'rounded-full bg-primary px-6 py-2 active:opacity-80'
                  }
                  onPress={() => followUser.mutate(profile.isFollowing)}
                  disabled={followUser.isPending}
                >
                  <Text
                    className={
                      profile.isFollowing
                        ? 'font-sans-bold text-neutral-900 dark:text-neutral-50'
                        : 'font-sans-bold text-white'
                    }
                  >
                    {profile.isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        <View className="mt-2 flex-row items-center gap-1.5">
          <Text className="text-[22px] font-sans-bold text-neutral-900 dark:text-neutral-50">
            {profile.displayName || profile.username}
          </Text>
          {profile.emailVerified && <BadgeCheck size={18} color="#3b82f6" />}
        </View>
        <Text className="text-neutral-500">@{profile.username}</Text>

        {profile.bio ? (
          <Text className="mt-3 text-[16px] leading-[22px] text-neutral-900 dark:text-neutral-50">{profile.bio}</Text>
        ) : null}

        <View className="mt-3 flex-row items-center gap-1.5">
          <CalendarDays size={15} color="#737373" />
          <Text className="text-sm text-neutral-500">
            {format(new Date(profile.joinedAt), 'MMMM yyyy')} tarihinde katıldı
          </Text>
        </View>

        <View className="mt-3 flex-row gap-5">
          <Pressable
            className="flex-row gap-1"
            onPress={() =>
              router.push({
                pathname: '/user/[username]/follows',
                params: { username: profile.username, type: 'following', name: profile.displayName || profile.username },
              })
            }
          >
            <Text className="font-sans-bold text-neutral-900 dark:text-neutral-50">{profile.followingCount}</Text>
            <Text className="text-neutral-500">Takip Edilen</Text>
          </Pressable>
          <Pressable
            className="flex-row gap-1"
            onPress={() =>
              router.push({
                pathname: '/user/[username]/follows',
                params: { username: profile.username, type: 'followers', name: profile.displayName || profile.username },
              })
            }
          >
            <Text className="font-sans-bold text-neutral-900 dark:text-neutral-50">{profile.followerCount}</Text>
            <Text className="text-neutral-500">Takipçi</Text>
          </Pressable>
        </View>
      </View>

      <View className="flex-row border-b border-neutral-100 dark:border-neutral-800">
        {(['posts', 'replies', 'likes'] as const).map((tab) => {
          const active = activeTab === tab;
          const label = tab === 'posts' ? 'Gönderiler' : tab === 'replies' ? 'Yanıtlar' : 'Beğeniler';
          return (
            <Pressable
              key={tab}
              className="flex-1 items-center active:bg-neutral-50 dark:active:bg-neutral-900/40"
              onPress={() => onTabChange(tab)}
            >
              <View className="items-center py-3.5">
                <Text
                  className={
                    active
                      ? 'text-[15px] font-sans-bold text-neutral-900 dark:text-neutral-50'
                      : 'text-[15px] font-sans-medium text-neutral-500'
                  }
                >
                  {label}
                </Text>
                {active && (
                  <View className="absolute bottom-0 h-[3px] w-full rounded-full bg-neutral-900 dark:bg-neutral-50" />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ProfileView({ username }: { username: string | undefined }) {
  const account = useAuthStore((s) => s.account);
  const [activeTab, setActiveTab] = useState<Tab>('posts');

  const profileQuery = useProfile(username);
  const posts = useProfilePosts(username);
  const replies = useProfileReplies(username);
  const likes = useProfileLikes(username);

  const activeQuery = activeTab === 'posts' ? posts : activeTab === 'replies' ? replies : likes;
  const items: (FeedItemResponse | PostResponse)[] =
    activeQuery.data?.pages.flatMap((page): (FeedItemResponse | PostResponse)[] => page.content) ?? [];

  if (profileQuery.status === 'pending') {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (profileQuery.status === 'error' || !profileQuery.data) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8 dark:bg-neutral-950">
        <Text className="text-center text-neutral-500">Kullanıcı bulunamadı.</Text>
      </View>
    );
  }

  const profile = profileQuery.data;
  const isOwn = profile.username === account?.username;

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <FlatList
        data={items}
        keyExtractor={(item, index) => {
          if ('post' in item) {
            return `${item.type}-${item.post.id}-${item.reposter?.id ?? 'none'}-${index}`;
          }
          return `${item.id}-${index}`;
        }}
        renderItem={({ item }) =>
          'post' in item ? (
            <PostCard post={item.post} feedType={item.type} reposter={item.reposter} />
          ) : (
            <PostCard post={item} />
          )
        }
        ListHeaderComponent={
          <ProfileHeader
            profile={profile}
            isOwn={isOwn}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        }
        onEndReached={() => {
          if (activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) {
            void activeQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <ThemedRefreshControl
            refreshing={activeQuery.isRefetching}
            onRefresh={() => {
              void profileQuery.refetch();
              void activeQuery.refetch();
            }}
          />
        }
        ListEmptyComponent={
          activeQuery.status === 'pending' ? (
            <View className="items-center py-10">
              <ActivityIndicator />
            </View>
          ) : (
            <View className="items-center py-10">
              <Text className="text-neutral-500">Henüz bir şey yok.</Text>
            </View>
          )
        }
        ListFooterComponent={
          activeQuery.isFetchingNextPage ? (
            <View className="items-center py-4">
              <ActivityIndicator />
            </View>
          ) : null
        }
      />
    </View>
  );
}
