import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Copy, Download, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { LegalTitle, LegalSection } from './LegalProse';
import type { MobileVersionResponse } from '@/types/api';

export function DownloadPage() {
  const { t } = useTranslation();

  const { data } = useQuery({
    queryKey: ['mobile-version'],
    queryFn: async () => {
      const { data } = await api.get<MobileVersionResponse>('/mobile/version');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const available = !!data && data.latestVersionCode > 0 && !!data.apkUrl;
  const hasChecksum = !!data?.apkSha256;

  const copyChecksum = () => {
    if (data?.apkSha256) {
      void navigator.clipboard.writeText(data.apkSha256);
      toast.success(t('legal.download.checksumCopied'));
    }
  };

  return (
    <article>
      <LegalTitle title={t('legal.download.title')} />

      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-zinc-200 bg-card p-6 dark:border-zinc-800/60">
        <img src="/logo.svg" alt="SocialHan" className="h-12 w-12 rounded-xl shadow-lg shadow-primary/20" />
        <div className="flex-1">
          <h3 className="font-bold text-foreground">{t('legal.download.androidTitle')}</h3>
          <p className="text-sm text-muted-foreground">
            {available
              ? t('legal.download.versionLabel', { version: data.latestVersionName })
              : t('legal.download.notAvailable')}
          </p>
        </div>
        {available && (
          <Button className="gap-2" render={<a href={data.apkUrl} />}>
            <Download className="h-4 w-4" /> {t('legal.download.downloadButton')}
          </Button>
        )}
      </div>

      {available && hasChecksum && (
        <div className="mb-6 rounded-2xl border border-zinc-200 bg-card p-6 dark:border-zinc-800/60">
          <div className="mb-3 flex items-center gap-2 text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h3 className="font-bold">{t('legal.download.checksumTitle')}</h3>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">{t('legal.download.checksumBody')}</p>
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
            <code className="flex-1 select-all break-all font-mono text-xs text-foreground">{data.apkSha256}</code>
            <Button variant="ghost" size="icon-sm" onClick={copyChecksum} aria-label={t('legal.download.copyChecksum')}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      <LegalSection title={t('legal.download.aboutTitle')}>
        <p>{t('legal.download.aboutBody')}</p>
      </LegalSection>
    </article>
  );
}
