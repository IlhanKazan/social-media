import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { LoginResponse, ErrorResponse, MfaMethod } from '@/types/api';
import type { TFunction } from 'i18next';

type MfaState = { mfaToken?: string; methods?: MfaMethod[]; from?: string };

function getCopy(t: TFunction, method: MfaMethod) {
  const copy: Record<MfaMethod, { title: string; desc: string; placeholder: string; numeric: boolean }> = {
    TOTP: { title: t('auth.mfa.totpTitle'), desc: t('auth.mfa.totpDesc'), placeholder: '000000', numeric: true },
    EMAIL: { title: t('auth.mfa.emailTitle'), desc: t('auth.mfa.emailDesc'), placeholder: '000000', numeric: true },
    RECOVERY: { title: t('auth.mfa.recoveryTitle'), desc: t('auth.mfa.recoveryDesc'), placeholder: t('auth.mfa.recoveryPlaceholder'), numeric: false },
  };
  return copy[method];
}

export function MfaChallengePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const state = (location.state as MfaState | null) ?? {};
  const from = state.from || '/';
  const methods: MfaMethod[] = state.methods?.length ? state.methods : ['EMAIL'];

  const [method, setMethod] = useState<MfaMethod>(methods.includes('TOTP') ? 'TOTP' : 'EMAIL');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const verify = useMutation<LoginResponse, AxiosError<ErrorResponse>, void>({
    mutationFn: async () =>
      (await api.post<LoginResponse>('/auth/mfa/verify', { mfaToken: state.mfaToken, method, code: code.trim() })).data,
    onSuccess: (data) => {
      login({
        accessToken: data.accessToken!,
        accessTokenExpiresIn: data.accessTokenExpiresIn!,
        refreshTokenExpiresIn: data.refreshTokenExpiresIn!,
        account: data.account!,
      });
      navigate(from, { replace: true });
    },
    onError: (e) => setError(e.response?.data?.message || t('auth.mfa.verifyError')),
  });

  const resend = useMutation({
    mutationFn: async () => {
      await api.post('/auth/mfa/resend', { mfaToken: state.mfaToken });
    },
    onSuccess: () => toast.success(t('auth.mfa.resendSuccess')),
    onError: () => toast.error(t('auth.mfa.resendError')),
  });

  if (!state.mfaToken) {
    return <Navigate to="/login" replace />;
  }

  const c = getCopy(t, method);
  const switchMethod = (m: MfaMethod) => {
    setMethod(m);
    setCode('');
    setError(null);
    // The email code isn't auto-sent at login when TOTP is also enabled, so send one on demand.
    if (m === 'EMAIL') resend.mutate();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{c.title}</h1>
        <p className="text-muted-foreground font-light text-lg">{c.desc}</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          if (code.trim().length >= (method === 'RECOVERY' ? 8 : 6)) verify.mutate();
        }}
        className="space-y-5"
      >
        <div className="space-y-2">
          <Label htmlFor="code">{method === 'RECOVERY' ? t('auth.mfa.recoveryCodeLabel') : t('auth.mfa.codeLabel')}</Label>
          <Input
            id="code"
            inputMode={c.numeric ? 'numeric' : 'text'}
            autoComplete="one-time-code"
            placeholder={c.placeholder}
            maxLength={method === 'RECOVERY' ? 20 : 6}
            value={code}
            onChange={(e) => setCode(c.numeric ? e.target.value.replace(/\D/g, '') : e.target.value)}
            className={c.numeric ? 'h-12 text-center text-lg tracking-[0.5em]' : 'h-12'}
          />
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base font-semibold transition-transform active:scale-95"
          disabled={verify.isPending || code.trim().length < (method === 'RECOVERY' ? 8 : 6)}
        >
          {verify.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : t('auth.mfa.verify')}
        </Button>
      </form>

      <div className="space-y-3 text-sm">
        {/* switch between the two primary factors when both are available */}
        {method !== 'RECOVERY' && methods.length > 1 && (
          <div className="flex gap-3 text-muted-foreground">
            {methods.includes('TOTP') && method !== 'TOTP' && (
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => switchMethod('TOTP')}>
                {t('auth.mfa.useAuthenticatorCode')}
              </button>
            )}
            {methods.includes('EMAIL') && method !== 'EMAIL' && (
              <button type="button" className="font-medium text-primary hover:underline" onClick={() => switchMethod('EMAIL')}>
                {t('auth.mfa.useEmailCode')}
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-muted-foreground">
          {method === 'EMAIL' ? (
            <button type="button" className="font-medium text-primary hover:underline disabled:opacity-50" onClick={() => resend.mutate()} disabled={resend.isPending}>
              {t('auth.mfa.resendCode')}
            </button>
          ) : method === 'RECOVERY' ? (
            <button type="button" className="font-medium text-primary hover:underline" onClick={() => switchMethod(methods.includes('TOTP') ? 'TOTP' : 'EMAIL')}>
              {t('auth.mfa.backToNormalCode')}
            </button>
          ) : (
            <button type="button" className="font-medium text-primary hover:underline" onClick={() => switchMethod('RECOVERY')}>
              {t('auth.mfa.useRecoveryCode')}
            </button>
          )}
          <button type="button" className="hover:text-foreground" onClick={() => navigate('/login', { replace: true })}>
            {t('auth.mfa.backToLogin')}
          </button>
        </div>
      </div>
    </div>
  );
}
