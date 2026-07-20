import { Stack, useLocalSearchParams } from 'expo-router';

import { ProfileView } from '@/components/profile-view';

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  return (
    <>
      <Stack.Screen options={{ title: username ? `@${username}` : 'Profil', headerShown: true }} />
      <ProfileView username={username} />
    </>
  );
}
