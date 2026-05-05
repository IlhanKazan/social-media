import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { resetPasswordSchema, type ResetPasswordInput } from './schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle } from 'lucide-react';
import type { ErrorResponse } from '@/types/api';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const { register, handleSubmit, formState: { errors }, setError } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const mutation = useMutation<void, AxiosError<ErrorResponse>, ResetPasswordInput>({
    mutationFn: async (data) => {
      await api.post('/auth/password-reset/confirm', {
        token,
        newPassword: data.newPassword
      });
    },
    onSuccess: () => {
      toast.success('Şifreniz başarıyla güncellendi.', {
        description: 'Yeni şifrenizle giriş yapabilirsiniz.'
      });
      navigate('/login');
    },
    onError: (error) => {
      setError('root', {
        message: error.response?.data?.message || 'Şifre sıfırlanırken bir hata oluştu. Linkin süresi dolmuş olabilir.'
      });
    }
  });

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Geçersiz Bağlantı</h1>
        <p className="text-muted-foreground">Şifre sıfırlama token'ı bulunamadı. Lütfen e-postanızdaki bağlantıyı kontrol edin.</p>
        <Link to="/forgot-password">
          <Button variant="outline" className="mt-4">Yeni bağlantı iste</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Yeni Şifre Belirle</h1>
        <p className="text-muted-foreground font-light text-lg">Lütfen hesabın için yeni ve güçlü bir şifre gir.</p>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="newPassword" className={errors.newPassword ? "text-destructive" : ""}>Yeni Şifre</Label>
          <Input
            id="newPassword"
            type="password"
            placeholder="••••••••"
            className={`h-12 bg-zinc-50/50 ${errors.newPassword ? "border-destructive focus:ring-destructive/20" : ""}`}
            {...register('newPassword')}
          />
          {errors.newPassword && <p className="text-xs font-medium text-destructive">{errors.newPassword.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className={errors.confirmPassword ? "text-destructive" : ""}>Şifre Tekrarı</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            className={`h-12 bg-zinc-50/50 ${errors.confirmPassword ? "border-destructive focus:ring-destructive/20" : ""}`}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && <p className="text-xs font-medium text-destructive">{errors.confirmPassword.message}</p>}
        </div>

        {errors.root && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive border border-destructive/20">
            {errors.root.message}
          </div>
        )}

        <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Şifreyi Güncelle'}
        </Button>
      </form>
    </div>
  );
}
