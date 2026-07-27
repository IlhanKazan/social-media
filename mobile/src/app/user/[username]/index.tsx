import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ProfileView } from '@/components/profile-view';

export default function UserProfileScreen() {
  const { t } = useTranslation();
  const { username } = useLocalSearchParams<{ username: string }>();
  return (
    <>
      <Stack.Screen options={{ title: username ? `@${username}` : t('profile.defaultTitle'), headerShown: true }} />
      <ProfileView username={username} />
    </>
  );
}
