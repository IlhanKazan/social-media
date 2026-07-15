import { Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
      <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
        SocialHan
      </Text>
      <Text className="mt-2 text-neutral-500 dark:text-neutral-400">
        Feed comes in M4.
      </Text>
    </View>
  );
}
