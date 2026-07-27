import { useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useStartEmailMfaSetup, useEnableEmailMfa, useDisableEmailMfa } from '../hooks/use-mfa';

export function MfaSection({ enabled, emailVerified }: { enabled: boolean; emailVerified: boolean }) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  const start = useStartEmailMfaSetup();
  const enable = useEnableEmailMfa();
  const disable = useDisableEmailMfa();

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-card p-4 dark:border-zinc-800">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-[15px] font-bold">{t('settings.mfaEmail.title')}</p>
          <p className="text-sm text-muted-foreground">
            {enabled
              ? t('settings.mfaEmail.enabledDesc')
              : t('settings.mfaEmail.disabledDesc')}
          </p>
        </div>
      </div>

      {enabled ? (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (password) disable.mutate(password);
          }}
        >
          <Input
            type="password"
            placeholder={t('settings.mfaEmail.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="sm:max-w-xs"
          />
          <Button type="submit" variant="destructive" disabled={disable.isPending || !password}>
            {disable.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('settings.mfaEmail.disable')}
          </Button>
        </form>
      ) : !confirming ? (
        <div className="space-y-2">
          {!emailVerified && (
            <p className="text-sm text-amber-600 dark:text-amber-500">
              {t('settings.mfaEmail.verifyFirstWarning')}
            </p>
          )}
          <Button
            variant="outline"
            disabled={start.isPending}
            onClick={() => {
              if (!emailVerified) {
                toast.error(t('settings.mfaEmail.verifyFirstToast'));
                return;
              }
              start.mutate(undefined, { onSuccess: () => setConfirming(true) });
            }}
          >
            {start.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('settings.mfaEmail.enable')}
          </Button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length >= 6) enable.mutate(code, { onSuccess: () => { setConfirming(false); setCode(''); } });
          }}
        >
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={t('settings.mfaEmail.codePlaceholder')}
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="sm:max-w-xs"
          />
          <Button type="submit" disabled={enable.isPending || code.length < 6}>
            {enable.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('settings.mfaEmail.confirm')}
          </Button>
          <Button type="button" variant="ghost" onClick={() => { setConfirming(false); setCode(''); }}>
            {t('settings.mfaEmail.cancel')}
          </Button>
        </form>
      )}
    </div>
  );
}
