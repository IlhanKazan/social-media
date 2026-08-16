import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-800/60">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="SocialHan" className="h-6 w-6 rounded-md" />
          <span>© {new Date().getFullYear()} SocialHan</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link to="/about" className="transition-colors hover:text-foreground">{t('marketing.footer.aboutLink')}</Link>
          <Link to="/architecture" className="transition-colors hover:text-foreground">{t('marketing.footer.architectureLink')}</Link>
          <Link to="/download" className="transition-colors hover:text-foreground">{t('marketing.footer.downloadLink')}</Link>
          <Link to="/changelog" className="transition-colors hover:text-foreground">{t('marketing.footer.changelogLink')}</Link>
          <Link to="/privacy" className="transition-colors hover:text-foreground">{t('marketing.footer.privacyLink')}</Link>
          <Link to="/terms" className="transition-colors hover:text-foreground">{t('marketing.footer.termsLink')}</Link>
        </nav>
      </div>
      <div className="border-t border-zinc-200 px-6 py-3 text-center text-xs text-muted-foreground dark:border-zinc-800/60">
        {t('marketing.footer.disclaimer')}
      </div>
    </footer>
  );
}
