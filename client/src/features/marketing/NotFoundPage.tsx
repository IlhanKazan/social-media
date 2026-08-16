import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass, Home, MoveLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDocumentMeta } from '@/hooks/use-document-meta';

export function NotFoundPage() {
  const { t } = useTranslation();

  useDocumentMeta({
    title: t('notFound.title'),
    description: t('notFound.description'),
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <img src="/logo.svg" alt="" aria-hidden className="h-14 w-14 rounded-2xl opacity-90" />

        <div className="flex flex-col gap-2">
          <p className="font-mono text-sm tracking-[0.2em] text-muted-foreground">404</p>
          <h1 className="text-balance text-2xl font-bold text-foreground sm:text-3xl">
            {t('notFound.heading')}
          </h1>
          <p className="text-balance text-muted-foreground">{t('notFound.body')}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button render={<Link to="/home" />} className="gap-2">
            <Home className="h-4 w-4" />
            {t('notFound.goHome')}
          </Button>
          <Button variant="outline" render={<Link to="/explore" />} className="gap-2">
            <Compass className="h-4 w-4" />
            {t('notFound.explore')}
          </Button>
        </div>

        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <MoveLeft className="h-3.5 w-3.5" />
          {t('notFound.back')}
        </button>
      </div>
    </main>
  );
}
