import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';

export function AdminRoute() {
  const account = useAuthStore((state) => state.account);
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!token || !account) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (account.role !== 'ROLE_ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
