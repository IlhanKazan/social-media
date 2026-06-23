import { Loader2, Database, Trash2, Gauge, ShieldX } from 'lucide-react';
import { useCaches, useInvalidateCache, useResetRateLimits } from './hooks/use-admin-ops';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';

export function AdminMaintenancePage() {
  const { data: caches, isLoading } = useCaches();
  const invalidate = useInvalidateCache();
  const resetRateLimits = useResetRateLimits();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Bakım</h1>
        <p className="text-[15px] text-muted-foreground">
          API'yi yeniden başlatmadan önbellekleri temizle ve rate-limit sayaçlarını sıfırla.
        </p>
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-start justify-between gap-4 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-[16px]">Önbellekler</CardTitle>
              <CardDescription>
                Bayatlamış veriyi temizlemek için bir önbelleği veya tümünü boşalt.
              </CardDescription>
            </div>
          </div>

          <Dialog>
            <DialogTrigger render={<Button variant="outline" className="shrink-0 gap-2" />}>
              <Trash2 className="h-4 w-4" /> Hepsini Temizle
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tüm önbellekleri temizle?</DialogTitle>
                <DialogDescription>
                  Bütün önbellekler boşaltılır. Veriler bir sonraki istekte kaynaktan yeniden yüklenir.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="ghost" />}>Vazgeç</DialogClose>
                <Button disabled={invalidate.isPending} onClick={() => invalidate.mutate(undefined)}>
                  Evet, Temizle
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <div className="border-t border-zinc-200 dark:border-zinc-800">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !caches || caches.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Kayıtlı önbellek yok.</p>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {caches.map((name) => (
                <li key={name} className="flex items-center justify-between px-6 py-3">
                  <code className="text-sm">{name}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground hover:text-foreground"
                    disabled={invalidate.isPending}
                    onClick={() => invalidate.mutate(name)}
                  >
                    <Trash2 className="h-4 w-4" /> Temizle
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="flex flex-row items-start justify-between gap-4 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Gauge className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-[16px]">Rate Limit</CardTitle>
              <CardDescription>
                Yanlışlıkla 429'a takılan kullanıcı/IP sayaçlarını sıfırla.
              </CardDescription>
            </div>
          </div>

          <Dialog>
            <DialogTrigger render={<Button variant="outline" className="shrink-0 gap-2" />}>
              <ShieldX className="h-4 w-4" /> Sıfırla
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rate-limit sayaçlarını sıfırla?</DialogTitle>
                <DialogDescription>
                  Tüm kullanıcı ve IP sayaçları sıfırlanır; herkes limitlere yeniden tam erişir.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="ghost" />}>Vazgeç</DialogClose>
                <Button disabled={resetRateLimits.isPending} onClick={() => resetRateLimits.mutate()}>
                  Evet, Sıfırla
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>
    </div>
  );
}
