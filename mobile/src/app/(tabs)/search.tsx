import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { FileQuestion, Search, UserX, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { PostCard } from '@/components/post-card';
import { useSearch } from '@/features/search/queries';
import type { PublicAccountResponse } from '@/types/api';

type Tab = 'users' | 'posts';

function UserRow({ user }: { user: PublicAccountResponse }) {
  const router = useRouter();
  return (
    <Pressable
      className="flex-row items-center gap-3 border-b border-neutral-100 px-4 py-3 active:bg-neutral-50 dark:border-neutral-800/70 dark:active:bg-neutral-900/40"
      onPress={() => router.push(`/user/${user.username}`)}
    >
      {user.profileImageUrl ? (
        <Image source={{ uri: user.profileImageUrl }} style={{ width: 48, height: 48, borderRadius: 24 }} />
      ) : (
        <View className="h-12 w-12 items-center justify-center rounded-full bg-neutral-300 dark:bg-neutral-700">
          <Text className="font-sans-bold text-neutral-700 dark:text-neutral-200">
            {user.username.substring(0, 2).toUpperCase()}
          </Text>
        </View>
      )}
      <View className="min-w-0 flex-1">
        <Text className="text-[16px] font-sans-bold text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
          {user.displayName || user.username}
        </Text>
        <Text className="text-[14px] text-neutral-500" numberOfLines={1}>
          @{user.username}
        </Text>
        {user.bio ? (
          <Text className="mt-0.5 text-[14px] text-neutral-500" numberOfLines={1}>
            {user.bio}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View className="items-center justify-center gap-3 py-20">
      {icon}
      <Text className="text-center text-[15px] text-neutral-500">{text}</Text>
    </View>
  );
}

export default function SearchScreen() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('users');

  useEffect(() => {
    const handle = setTimeout(() => setQuery(input.trim()), 400);
    return () => clearTimeout(handle);
  }, [input]);

  const { data, status, isFetching } = useSearch(query);

  return (
    <View className="flex-1 bg-white dark:bg-neutral-950">
      <View className="px-4 py-2">
        <View className="flex-row items-center gap-2 rounded-full bg-neutral-100 px-4 dark:bg-neutral-900">
          <Search size={17} color="#71767b" />
          <TextInput
            className="flex-1 py-2.5 text-[16px] text-neutral-900 dark:text-neutral-50"
            placeholder="Kişi veya gönderi ara"
            placeholderTextColor="#71767b"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            value={input}
            onChangeText={setInput}
          />
          {input.length > 0 && (
            <Pressable hitSlop={8} onPress={() => setInput('')}>
              <X size={17} color="#71767b" />
            </Pressable>
          )}
        </View>
      </View>

      {!query ? (
        <EmptyState
          icon={<Search size={44} color="#d4d4d4" />}
          text="Aramak istediğin kelimeyi yukarıya yaz."
        />
      ) : status === 'pending' || isFetching ? (
        <View className="items-center py-16">
          <ActivityIndicator size="large" />
        </View>
      ) : status === 'error' ? (
        <EmptyState
          icon={<FileQuestion size={44} color="#d4d4d4" />}
          text="Arama sonuçları getirilirken bir hata oluştu."
        />
      ) : (
        <>
          <View className="flex-row border-b border-neutral-100 dark:border-neutral-800">
            {(['users', 'posts'] as const).map((tab) => {
              const active = activeTab === tab;
              const label =
                tab === 'users'
                  ? `Kişiler (${data?.users.length ?? 0})`
                  : `Gönderiler (${data?.posts.length ?? 0})`;
              return (
                <Pressable
                  key={tab}
                  className="flex-1 items-center active:bg-neutral-50 dark:active:bg-neutral-900/40"
                  onPress={() => setActiveTab(tab)}
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

          {activeTab === 'users' ? (
            <FlatList
              data={data?.users ?? []}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => <UserRow user={item} />}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <EmptyState icon={<UserX size={44} color="#d4d4d4" />} text="Kullanıcı bulunamadı." />
              }
            />
          ) : (
            <FlatList
              data={data?.posts ?? []}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => <PostCard post={item} />}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <EmptyState icon={<FileQuestion size={44} color="#d4d4d4" />} text="Gönderi bulunamadı." />
              }
            />
          )}
        </>
      )}
    </View>
  );
}
