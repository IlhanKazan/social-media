import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { LoginResponse, ErrorResponse } from '@/types/api';

type MfaState = { mfaToken?: string; methods?: string[]; from?: string };

export function MfaChallengePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const state = (location.state as MfaState | null) ?? {};
  const from = state.from || '/';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const verify = useMutation<LoginResponse, AxiosError<ErrorResponse>, void>({
    mutationFn: async () =>
      (await api.post<LoginResponse>('/auth/mfa/verify', { mfaToken: state.mfaToken, method: 'EMAIL', code })).data,
    onSuccess: (data) => {
      login({
        accessToken: data.accessToken!,
        accessTokenExpiresIn: data.accessTokenExpiresIn!,
        refreshTokenExpiresIn: data.refreshTokenExpiresIn!,
        account: data.account!,
      });
      navigate(from, { replace: true });
    },
    onError: (e) => setError(e.response?.data?.message || 'Kod doğrulanamadı. Lütfen tekrar dene.'),
  });

  const resend = useMutation({
    mutationFn: async () => {
      await api.post('/auth/mfa/resend', { mfaToken: state.mfaToken });
    },
    onSuccess: () => toast.success('Yeni kod e-postana gönderildi.'),
    onError: () => toast.error('Kod gönderilemedi.'),
  });

  if (!state.mfaToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">İki adımlı doğrulama</h1>
        <p className="text-muted-foreground font-light text-lg">
          E-postana gönderdiğimiz 6 haneli kodu gir.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (code.trim().length >= 6) verify.mutate();
        }}
        className="space-y-5"
      >
        <div className="space-y-2">
          <Label htmlFor="code">Doğrulama kodu</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="h-12 text-center text-lg tracking-[0.5em]"
          />
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold transition-transform active:scale-95"
          disabled={verify.isPending || code.trim().length < 6}
        >
          {verify.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Doğrula ve giriş yap'}
        </Button>
      </form>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <button
          type="button"
          className="font-medium text-primary hover:underline disabled:opacity-50"
          onClick={() => resend.mutate()}
          disabled={resend.isPending}
        >
          Kodu tekrar gönder
        </button>
        <button
          type="button"
          className="hover:text-foreground"
          onClick={() => navigate('/login', { replace: true })}
        >
          Girişe dön
        </button>
      </div>
    </div>
  );
}
