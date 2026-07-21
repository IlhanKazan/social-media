import { Image } from 'expo-image';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';

import { useMentionSuggestions } from '@/features/mentions/queries';

interface Props {
  query: string;
  onSelect: (username: string) => void;
}

export function MentionSuggestions({ query, onSelect }: Props) {
  const { data, isLoading } = useMentionSuggestions(query);
  const results = data ?? [];

  if (!query || (!isLoading && results.length === 0)) return null;

  return (
    <View className="max-h-48 border-b border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      {isLoading ? (
        <View className="flex-row items-center gap-2 px-4 py-3">
          <ActivityIndicator size="small" />
          <Text className="text-sm text-neutral-500">Aranıyor...</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              className="flex-row items-center gap-2.5 px-4 py-2.5 active:bg-neutral-50 dark:active:bg-neutral-900"
              onPress={() => onSelect(item.username)}
            >
              {item.profileImageUrl ? (
                <Image source={{ uri: item.profileImageUrl }} style={{ width: 32, height: 32, borderRadius: 16 }} />
              ) : (
                <View className="h-8 w-8 items-center justify-center rounded-full bg-neutral-300 dark:bg-neutral-700">
                  <Text className="text-xs font-sans-bold text-neutral-700 dark:text-neutral-200">
                    {item.username.substring(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-sans-semibold text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
                  {item.displayName || item.username}
                </Text>
                <Text className="text-xs text-neutral-500" numberOfLines={1}>
                  @{item.username}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
