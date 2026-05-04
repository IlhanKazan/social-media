import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { registerSchema, type RegisterInput } from './schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import type { AuthResponse, ErrorResponse } from '@/types/api';

export function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const { register, handleSubmit, formState: { errors }, setError } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '', displayName: '' },
  });

  const mutation = useMutation<AuthResponse, AxiosError<ErrorResponse>, Omit<RegisterInput, 'confirmPassword'>>({
    mutationFn: async (data) => {
      const res = await api.post<AuthResponse>('/auth/register', data);
      return res.data;
    },
    onSuccess: (data) => {
      login(data);
      navigate('/');
    },
    onError: (error) => {
      if (error.response?.data?.fieldErrors) {
        Object.entries(error.response.data.fieldErrors).forEach(([field, msg]) => {
          setError(field as keyof RegisterInput, { message: msg });
        });
      } else if (error.response?.data?.message) {
        setError('root', { message: error.response.data.message });
      } else {
        setError('root', { message: 'Kayıt olunamadı. Lütfen tekrar dene.' });
      }
    }
  });

  const onSubmit = (values: RegisterInput) => {
    const { confirmPassword, ...dataToSend } = values;
    mutation.mutate(dataToSend);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Aramıza katıl</h1>
        <p className="text-muted-foreground font-light text-lg">Hesabını oluştur ve akışta yerini al.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="username" className={errors.username ? "text-destructive" : ""}>Kullanıcı Adı</Label>
          <Input
            id="username"
            placeholder="ilhankazan"
            className={`h-12 bg-zinc-50/50 transition-all focus:bg-white ${errors.username ? "border-destructive focus:ring-destructive/20" : ""}`}
            aria-invalid={!!errors.username}
            {...register('username')}
          />
          {errors.username && (
            <p className="text-xs font-medium text-destructive">{errors.username.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className={errors.email ? "text-destructive" : ""}>E-posta</Label>
          <Input
            id="email"
            type="email"
            placeholder="mail@ornek.com"
            className={`h-12 bg-zinc-50/50 transition-all focus:bg-white ${errors.email ? "border-destructive focus:ring-destructive/20" : ""}`}
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs font-medium text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName" className={errors.displayName ? "text-destructive" : ""}>Görünen Ad (İsteğe bağlı)</Label>
          <Input
            id="displayName"
            placeholder="İlhan Kazan"
            className={`h-12 bg-zinc-50/50 transition-all focus:bg-white ${errors.displayName ? "border-destructive focus:ring-destructive/20" : ""}`}
            aria-invalid={!!errors.displayName}
            {...register('displayName')}
          />
          {errors.displayName && (
            <p className="text-xs font-medium text-destructive">{errors.displayName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className={errors.password ? "text-destructive" : ""}>Şifre</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            className={`h-12 bg-zinc-50/50 transition-all focus:bg-white ${errors.password ? "border-destructive focus:ring-destructive/20" : ""}`}
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-xs font-medium text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className={errors.confirmPassword ? "text-destructive" : ""}>Şifre Tekrarı</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            className={`h-12 bg-zinc-50/50 transition-all focus:bg-white ${errors.confirmPassword ? "border-destructive focus:ring-destructive/20" : ""}`}
            aria-invalid={!!errors.confirmPassword}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-xs font-medium text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>

        {errors.root && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive border border-destructive/20">
            {errors.root.message}
          </div>
        )}

        <Button type="submit" className="w-full h-12 text-base font-semibold transition-transform active:scale-95" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Kayıt Ol'}
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Zaten hesabın var mı?{' '}
        <Link to="/login" className="font-bold text-primary hover:underline transition-colors">
          Giriş yap
        </Link>
      </div>
    </div>
  );
}
