import { useState } from 'react';
import { Smartphone, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStartTotpSetup, useEnableTotp, useDisableTotp } from '../hooks/use-mfa';
import type { TotpSetupResponse } from '@/types/api';

export function TotpSection({ enabled }: { enabled: boolean }) {
  const [setup, setSetup] = useState<TotpSetupResponse | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [recovery, setRecovery] = useState<string[] | null>(null);

  const start = useStartTotpSetup();
  const enable = useEnableTotp();
  const disable = useDisableTotp();

  const copyRecovery = () => {
    if (recovery) {
      void navigator.clipboard.writeText(recovery.join('\n'));
      toast.success('Kurtarma kodları kopyalandı.');
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-card p-4 dark:border-zinc-800">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-[15px] font-bold">Authenticator Uygulaması (TOTP)</p>
          <p className="text-sm text-muted-foreground">
            {enabled
              ? 'Açık. Girişte authenticator uygulamandaki kodu istiyoruz.'
              : 'Google Authenticator, 1Password gibi bir uygulamayla kod üret. E-posta gerektirmez.'}
          </p>
        </div>
      </div>

      {recovery ? (
        <div className="space-y-3 rounded-lg border border-amber-300/60 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Kurtarma kodlarını şimdi kaydet — bir daha gösterilmeyecek. Telefonunu kaybedersen bunlarla girersin.
          </p>
          <div className="grid grid-cols-2 gap-1 font-mono text-sm">
            {recovery.map((c) => <span key={c}>{c}</span>)}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={copyRecovery}>
              <Copy className="h-4 w-4" /> Kopyala
            </Button>
            <Button size="sm" onClick={() => { setRecovery(null); setSetup(null); }}>Kaydettim, bitir</Button>
          </div>
        </div>
      ) : enabled ? (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => { e.preventDefault(); if (password) disable.mutate(password); }}
        >
          <Input type="password" placeholder="Şifreni gir" value={password} onChange={(e) => setPassword(e.target.value)} className="sm:max-w-xs" />
          <Button type="submit" variant="destructive" disabled={disable.isPending || !password}>
            {disable.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Devre dışı bırak'}
          </Button>
        </form>
      ) : setup ? (
        <div className="space-y-3">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <img src={setup.qrDataUri} alt="QR" className="h-40 w-40 rounded-lg border border-zinc-200 dark:border-zinc-700" />
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Uygulamanla QR'ı tara veya bu anahtarı elle gir:</p>
              <code className="block break-all rounded bg-muted px-2 py-1 text-foreground">{setup.secret}</code>
            </div>
          </div>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length >= 6) {
                enable.mutate(code, { onSuccess: (codes) => { setRecovery(codes); setCode(''); } });
              }
            }}
          >
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Uygulamadaki 6 haneli kod"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              className="sm:max-w-xs"
            />
            <Button type="submit" disabled={enable.isPending || code.length < 6}>
              {enable.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Onayla ve aç'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setSetup(null); setCode(''); }}>Vazgeç</Button>
          </form>
        </div>
      ) : (
        <div>
          <Button variant="outline" disabled={start.isPending} onClick={() => start.mutate(undefined, { onSuccess: (data) => setSetup(data) })}>
            {start.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kur'}
          </Button>
        </div>
      )}
    </div>
  );
}
