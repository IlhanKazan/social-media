import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Download, Smartphone } from 'lucide-react';
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

  return (
    <article>
      <LegalTitle title={t('legal.download.title')} />

      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-zinc-200 bg-card p-6 dark:border-zinc-800/60">
        <div className="rounded-xl bg-primary/10 p-3 text-primary">
          <Smartphone className="h-6 w-6" />
        </div>
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

      <LegalSection title={t('legal.download.aboutTitle')}>
        <p>{t('legal.download.aboutBody')}</p>
      </LegalSection>
    </article>
  );
}
