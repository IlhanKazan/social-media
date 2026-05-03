import { Monitor, Moon, Sun, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { useLogoutAll, useDeleteAccount } from './hooks/use-security';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const logoutAllMutation = useLogoutAll();
  const deleteAccountMutation = useDeleteAccount();

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

      </div>
    </div>
  );
}
