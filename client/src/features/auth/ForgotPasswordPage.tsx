import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { forgotPasswordSchema, type ForgotPasswordInput } from './schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MailCheck, ArrowLeft } from 'lucide-react';

export function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: async (data: ForgotPasswordInput) => {
      await api.post('/auth/password-reset/request', data);
    },
    onSuccess: () => {
      setIsSubmitted(true);
    }
  });

  if (isSubmitted) {
    return (
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500 text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <MailCheck className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">E-postanı kontrol et</h1>
          <p className="text-muted-foreground text-[15px] leading-relaxed">
            Eğer bu e-posta adresiyle kayıtlı bir hesabın varsa, şifre sıfırlama bağlantısını gönderdik.
          </p>
        </div>
        <div className="pt-4">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Giriş sayfasına dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Şifreni mi unuttun?</h1>
        <p className="text-muted-foreground font-light text-lg">E-posta adresini gir, sana bir sıfırlama bağlantısı gönderelim.</p>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className={errors.email ? "text-destructive" : ""}>E-posta Adresi</Label>
          <Input
            id="email"
            type="email"
            placeholder="mail@ornek.com"
            className={`h-12 bg-zinc-50/50 transition-all focus:bg-white ${errors.email ? "border-destructive focus:ring-destructive/20" : ""}`}
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && <p className="text-xs font-medium text-destructive">{errors.email.message}</p>}
        </div>

        <Button type="submit" className="w-full h-12 text-base font-semibold transition-transform active:scale-95" disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sıfırlama Bağlantısı Gönder'}
        </Button>
      </form>

      <div className="text-center text-sm">
        <Link to="/login" className="font-bold text-primary hover:underline transition-colors flex items-center justify-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Giriş sayfasına dön
        </Link>
      </div>
    </div>
  );
}
