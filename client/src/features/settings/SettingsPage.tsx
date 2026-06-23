import {
  Monitor,
  Moon,
  Sun,
  AlertTriangle,
  ShieldAlert,
  LogOut,
  MailCheck,
  Loader2,
  BadgeCheck,
  KeyRound
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { useLogoutAll, useDeleteAccount } from './hooks/use-security';
import { useChangePassword } from './hooks/use-settings';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MfaSection } from './components/MfaSection';
import { TotpSection } from './components/TotpSection';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import type { MyAccountResponse } from '@/types/api';
import { useState } from "react";
import { Link } from 'react-router-dom';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const logoutAllMutation = useLogoutAll();
  const deleteAccountMutation = useDeleteAccount();
  const changePasswordMutation = useChangePassword();
  const logout = useAuthStore((state) => state.logout);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { data: account, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get<MyAccountResponse>('/accounts/me');
      return data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      await api.post('/accounts/me/email/send-verification');
    },
    onSuccess: () => {
      toast.success('Doğrulama e-postası gönderildi', {
        description: 'Lütfen gelen kutunuzu kontrol edin.'
      });
    },
    onError: (error: any) => {
      if (error.response?.status === 429) {
        toast.error('Çok fazla istek attınız', {
          description: 'Lütfen daha sonra tekrar deneyin.'
        });
      } else {
        toast.error('Bir hata oluştu', {
          description: 'Doğrulama e-postası gönderilemedi.'
        });
      }
    }
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('Yeni şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Yeni şifreler birbiriyle eşleşmiyor.');
      return;
    }

    if (oldPassword === newPassword) {
      toast.error('Yeni şifreniz eski şifrenizle aynı olamaz.');
      return;
    }

    changePasswordMutation.mutate({ oldPassword, newPassword });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <h2 className="text-xl font-bold">Ayarlar</h2>
      </div>

      <div className="p-4 space-y-8 max-w-2xl">

        <section className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-bold">Görünüm</h3>
            <p className="text-sm text-muted-foreground">Uygulama temanı özelleştir.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              className="gap-2"
              onClick={() => setTheme('light')}
            >
              <Sun className="h-4 w-4" /> Aydınlık
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              className="gap-2"
              onClick={() => setTheme('dark')}
            >
              <Moon className="h-4 w-4" /> Karanlık
            </Button>
            <Button
              variant={theme === 'system' ? 'default' : 'outline'}
              className="gap-2"
              onClick={() => setTheme('system')}
            >
              <Monitor className="h-4 w-4" /> Sistem
            </Button>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-bold">Hesap Doğrulama</h3>
            <p className="text-sm text-muted-foreground">E-posta adresini onayla ve mavi tik rozetini al.</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-card">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[15px]">E-posta Durumu</span>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : account?.emailVerified ? (
                  <BadgeCheck className="h-5 w-5 text-blue-500" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? 'Kontrol ediliyor...'
                  : account?.emailVerified
                    ? 'Hesabınız doğrulandı. Mavi tik rozetine sahipsiniz.'
                    : 'E-posta adresiniz henüz doğrulanmadı.'}
              </p>
            </div>

            {!isLoading && !account?.emailVerified && (
              <Button
                variant="outline"
                onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending}
                className="shrink-0 gap-2"
              >
                {verifyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
                Doğrulama Gönder
              </Button>
            )}
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2"><KeyRound className="h-5 w-5" /> Şifre Değiştir</h3>
            <p className="text-sm text-muted-foreground">Hesap güvenliğiniz için şifrenizi güçlü tutun.</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-card">
            <div className="space-y-2">
              <label className="text-sm font-medium">Mevcut Şifreniz</label>
              <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Yeni Şifre</label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Yeni Şifre (Tekrar)</label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
            </div>
            <div className="pt-2">
              <Button type="submit" disabled={changePasswordMutation.isPending || !oldPassword || !newPassword || !confirmPassword}>
                {changePasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Şifreyi Güncelle
              </Button>
            </div>
          </form>
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-bold">Güvenlik</h3>
            <p className="text-sm text-muted-foreground">Hesabına ikinci bir doğrulama katmanı ekle.</p>
          </div>
          <MfaSection enabled={account?.mfaEmailEnabled ?? false} emailVerified={account?.emailVerified ?? false} />
          <TotpSection enabled={account?.mfaTotpEnabled ?? false} />
        </section>

        <Separator />

        <section className="space-y-4">
          <div className="mb-4">
            <h3 className="text-lg font-bold">Oturum</h3>
            <p className="text-sm text-muted-foreground">Oturumunu yönet.</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <div>
              <p className="font-bold text-[15px]">Oturumu Kapat</p>
              <p className="text-sm text-muted-foreground">Sadece bu cihazdan çıkış yaparsın.</p>
            </div>
            <Button variant="outline" onClick={() => void logout()} className="gap-2 shrink-0">
              <LogOut className="h-4 w-4" /> Çıkış Yap
            </Button>
          </div>
        </section>

        <Separator />

        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-destructive flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Güvenlik & Tehlikeli İşlemler
            </h3>
            <p className="text-sm text-muted-foreground">Bu alandaki işlemler geri alınamaz.</p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <div>
                <p className="font-bold text-[15px]">Tüm Cihazlardan Çıkış Yap</p>
                <p className="text-sm text-muted-foreground">Şu anki cihazın dahil tüm oturumlarını sonlandırır.</p>
              </div>

              <Dialog>
                <DialogTrigger render={<Button variant="outline" className="shrink-0" />}>
                  Tümünden Çıkış Yap
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Emin misin?</DialogTitle>
                    <DialogDescription>
                      Bilgisayarın, telefonun ve diğer tüm aktif cihazlarındaki oturumların kapatılacak ve tekrar giriş yapman gerekecek.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose render={<Button variant="ghost" />}>İptal</DialogClose>
                    <Button
                      variant="destructive"
                      disabled={logoutAllMutation.isPending}
                      onClick={() => logoutAllMutation.mutate()}
                    >
                      {logoutAllMutation.isPending ? 'Çıkış Yapılıyor...' : 'Evet, Çıkış Yap'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-destructive/20 bg-destructive/5 rounded-xl">
              <div>
                <p className="font-bold text-[15px] text-destructive">Hesabımı Sil</p>
                <p className="text-sm text-muted-foreground">Gönderilerin, etkileşimlerin ve tüm verilerin kalıcı olarak silinir.</p>
              </div>

              <Dialog>
                <DialogTrigger render={<Button variant="destructive" className="shrink-0" />}>
                  Hesabımı Sil
                </DialogTrigger>
                <DialogContent className="border-destructive/20">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-5 w-5" /> Kalıcı Silme İşlemi
                    </DialogTitle>
                    <DialogDescription>
                      Bu işlemi geri alamazsın. Hesabın, gönderilerin, beğenilerin ve mesajların tamamen silinecek. Hesabını silmek istediğine emin misin?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose render={<Button variant="ghost" />}>Vazgeç</DialogClose>
                    <Button
                      variant="destructive"
                      disabled={deleteAccountMutation.isPending}
                      onClick={() => deleteAccountMutation.mutate()}
                    >
                      {deleteAccountMutation.isPending ? 'Siliniyor...' : 'Evet, Hesabımı Sil'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </section>

        <Separator />

        <section className="space-y-3">
          <div>
            <h3 className="text-lg font-bold">Yasal</h3>
            <p className="text-sm text-muted-foreground">Politikalar ve proje hakkında bilgi.</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link to="/about" className="text-primary hover:underline">Hakkında</Link>
            <Link to="/privacy" className="text-primary hover:underline">Gizlilik Politikası</Link>
            <Link to="/terms" className="text-primary hover:underline">Kullanım Şartları</Link>
          </div>
          <p className="text-xs text-muted-foreground">
            SocialHan bir portfolyo / demo projesidir, ticari bir hizmet değildir.
          </p>
        </section>

      </div>
    </div>
  );
}
