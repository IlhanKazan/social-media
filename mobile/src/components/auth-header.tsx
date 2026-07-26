import { Image } from 'expo-image';
import { Text, View } from 'react-native';

export function AuthHeader() {
  return (
    <View className="mb-8 flex-row items-center justify-center gap-3">
      <Image
        source={require('../../assets/images/icon.png')}
        style={{ width: 40, height: 40, borderRadius: 12 }}
      />
      <Text className="text-2xl font-sans-bold tracking-tight text-neutral-900 dark:text-neutral-50">
        SocialHan
      </Text>
    </View>
  );
}
