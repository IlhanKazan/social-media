import { ProfileView } from '@/components/profile-view';
import { useAuthStore } from '@/stores/auth-store';

export default function ProfileScreen() {
  const account = useAuthStore((s) => s.account);
  return <ProfileView username={account?.username} />;
}
