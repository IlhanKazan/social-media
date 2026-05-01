import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

export function RequireAuth() {
  const token = useAuthStore((state) => state.token);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const tryRefresh = useAuthStore((state) => state.tryRefresh);
  const location = useLocation();

  const [status, setStatus] = useState<'checking' | 'done'>(() =>
    token || !refreshToken ? 'done' : 'checking'
  );

  useEffect(() => {
    if (status !== 'checking') return;
    tryRefresh().then(() => setStatus('done'));
  }, [status, tryRefresh]);

  if (status === 'checking') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
