import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { loginSchema, type LoginInput } from './schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { AuthResponse, ErrorResponse } from '@/types/api';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const from = location.state?.from?.pathname || '/';

  const { register, handleSubmit, formState: { errors }, setError } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const mutation = useMutation<AuthResponse, AxiosError<ErrorResponse>, LoginInput>({
    mutationFn: async (data) => {
      const res = await api.post<AuthResponse>('/auth/login', data);
      return res.data;
    },
    onSuccess: (data) => {
      login(data);
      navigate(from, { replace: true });
    },
    onError: (error) => {
      if (error.response?.data?.fieldErrors) {
        Object.entries(error.response.data.fieldErrors).forEach(([field, msg]) => {
          setError(field as keyof LoginInput, { message: msg });
        });
      } else {
        setError('root', { message: error.response?.data?.message || 'Giriş yapılamadı. Bilgilerini kontrol et.' });
      }
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Tekrar hoş geldin</h1>
        <p className="text-muted-foreground font-light text-lg">Hesabına giriş yap ve akışa katıl.</p>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="identifier" className={errors.identifier ? "text-destructive" : ""}>
            Kullanıcı Adı veya E-posta
          </Label>
          <Input
            id="identifier"
            placeholder="kullanici@ornek.com"
            className={`h-12 bg-zinc-50/50 transition-all focus:bg-white ${errors.identifier ? "border-destructive focus:ring-destructive/20" : ""}`}
            aria-invalid={!!errors.identifier}
            {...register('identifier')}
          />
          {errors.identifier && <p className="text-xs font-medium text-destructive">{errors.identifier.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className={errors.password ? "text-destructive" : ""}>Şifre</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Şifremi unuttum?</Link>
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

        {errors.root && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive border border-destructive/20">
            {errors.root.message}
          </div>
        )}

        <Button type="submit" className="w-full h-12 text-base font-semibold transition-transform active:scale-95" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Giriş Yap'}
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Hesabın yok mu?{' '}
        <Link to="/register" className="font-bold text-primary hover:underline transition-colors">
          Hemen kaydol
        </Link>
      </div>
    </div>
  );
}
