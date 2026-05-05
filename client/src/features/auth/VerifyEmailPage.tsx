import { useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import type { ErrorResponse } from '@/types/api';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const hasAttempted = useRef(false);
  const queryClient = useQueryClient();

  const account = useAuthStore((state) => state.account);

  const mutation = useMutation<void, AxiosError<ErrorResponse>, string>({
    mutationFn: async (t) => {
      await api.post('/auth/verify-email', { token: t });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['profile-feed'] });

      if (account) {
        useAuthStore.setState({
          account: { ...account, emailVerified: true }
        });
      }
    }
  });

  useEffect(() => {
    if (token && !hasAttempted.current) {
      hasAttempted.current = true;
      mutation.mutate(token);
    }
  }, [token]);

  if (!token) {
    return (
      <div className="space-y-6 text-center animate-in fade-in duration-500">
        <XCircle className="h-16 w-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold">Geçersiz Bağlantı</h1>
        <p className="text-muted-foreground">E-posta doğrulama linki eksik veya hatalı.</p>
        <Button render={<Link to="/" />}>Ana Sayfaya Dön</Button>
      </div>
    );
  }

  if (mutation.isIdle || mutation.isPending) {
    return (
      <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="space-y-4">
          <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto" />
          <h1 className="text-2xl font-bold">Doğrulanıyor...</h1>
          <p className="text-muted-foreground">Lütfen bekleyin, e-posta adresiniz onaylanıyor.</p>
        </div>
      </div>
    );
  }

  const isAlreadyUsed = mutation.error?.response?.data?.message?.includes('daha önce kullanılmış');

  if (mutation.isSuccess || isAlreadyUsed) {
    return (
      <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-2xl font-bold">E-posta Doğrulandı!</h1>
          <p className="text-muted-foreground">Hesabınız başarıyla onaylandı. Mavi tik rozetiniz profilinize eklendi.</p>
          <Button render={<Link to="/" />} className="mt-4">Akışa Git</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="space-y-4">
        <XCircle className="h-16 w-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold">Doğrulama Başarısız</h1>
        <p className="text-muted-foreground">
          {mutation.error?.response?.data?.message || 'Bağlantının süresi dolmuş olabilir.'}
        </p>
        <Button render={<Link to="/settings" />} variant="outline" className="mt-4">
          Yeni Bağlantı İste
        </Button>
      </div>
    </div>
  );
}
