import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { LandingPage } from '@/features/marketing/LandingPage';

export function RootIndex() {
  const account = useAuthStore((state) => state.account);
  if (account) return <Navigate to="/home" replace />;
  return <LandingPage />;
}
