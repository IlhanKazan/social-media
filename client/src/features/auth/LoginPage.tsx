import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AxiosError } from 'axios';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAuthStore } from '@/stores/auth-store';
import { createLoginSchema, type LoginInput } from './schemas';
import { RevealField } from './components/RevealField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { LoginResponse, ErrorResponse } from '@/types/api';

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const from = location.state?.from?.pathname || '/';

  const loginSchema = useMemo(() => createLoginSchema(t), [t, i18n.language]);

  const { register, handleSubmit, watch, formState: { errors }, setError } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const mutation = useMutation<LoginResponse, AxiosError<ErrorResponse>, LoginInput>({
    mutationFn: async (data) => {
      const res = await api.post<LoginResponse>('/auth/login', data);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.status === 'MFA_REQUIRED') {
        navigate('/mfa', { state: { mfaToken: data.mfaToken, methods: data.methods, from } });
        return;
      }
      login({
        accessToken: data.accessToken!,
        accessTokenExpiresIn: data.accessTokenExpiresIn!,
        refreshTokenExpiresIn: data.refreshTokenExpiresIn!,
        account: data.account!,
      });
      navigate(from, { replace: true });
    },
    onError: (error) => {
      if (error.response?.data?.fieldErrors) {
        Object.entries(error.response.data.fieldErrors).forEach(([field, msg]) => {
          setError(field as keyof LoginInput, { message: msg });
        });
      } else {
        setError('root', { message: getApiErrorMessage(t, error, 'auth.login.genericError') });
      }
    }
  });

  // Same progressive step as registration, so the two forms behave alike.
  const identifier = watch('identifier');
  const showPassword = (identifier?.length ?? 0) >= 3;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('auth.login.title')}</h1>
        <p className="text-muted-foreground font-light text-lg">{t('auth.login.subtitle')}</p>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="identifier" className={errors.identifier ? "text-destructive" : ""}>
            {t('auth.login.identifierLabel')}
          </Label>
          <Input
            id="identifier"
            placeholder={t('auth.login.identifierPlaceholder')}
            className={`h-12 bg-zinc-50/50 transition-all focus:bg-white ${errors.identifier ? "border-destructive focus:ring-destructive/20" : ""}`}
            aria-invalid={!!errors.identifier}
            {...register('identifier')}
          />
          {errors.identifier && <p className="text-xs font-medium text-destructive">{errors.identifier.message}</p>}
        </div>

        <RevealField show={showPassword} className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className={errors.password ? "text-destructive" : ""}>{t('auth.login.passwordLabel')}</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">{t('auth.login.forgotPassword')}</Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className={`h-12 bg-zinc-50/50 transition-all focus:bg-white ${errors.password ? "border-destructive focus:ring-destructive/20" : ""}`}
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          {errors.password && <p className="text-xs font-medium text-destructive">{errors.password.message}</p>}
        </div>
        </RevealField>

        {errors.root && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive border border-destructive/20">
            {errors.root.message}
          </div>
        )}

        <Button type="submit" className="w-full h-12 text-base font-semibold transition-transform active:scale-95" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : t('auth.login.submit')}
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        {t('auth.login.noAccount')}{' '}
        <Link to="/register" className="font-bold text-primary hover:underline transition-colors">
          {t('auth.login.signUp')}
        </Link>
      </div>
    </div>
  );
}
