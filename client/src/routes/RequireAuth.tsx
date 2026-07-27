import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useSessionKeepAlive } from '@/hooks/use-session-keep-alive';

export function RequireAuth() {
  const token = useAuthStore((state) => state.token);
  const tryRefresh = useAuthStore((state) => state.tryRefresh);
  const location = useLocation();

  // Rotate the access token before it expires, so an idle tab doesn't lose its
  // WebSocket session (which never surfaces a 401 to self-heal from).
  useSessionKeepAlive();

  const [status, setStatus] = useState<'checking' | 'done'>(() =>
    token ? 'done' : 'checking'
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
