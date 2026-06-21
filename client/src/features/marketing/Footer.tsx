import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-200 dark:border-zinc-800/60">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="SocialHan" className="h-6 w-6 rounded-md" />
          <span>© {new Date().getFullYear()} SocialHan</span>
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link to="/about" className="transition-colors hover:text-foreground">Hakkında</Link>
          <Link to="/privacy" className="transition-colors hover:text-foreground">Gizlilik</Link>
          <Link to="/terms" className="transition-colors hover:text-foreground">Şartlar</Link>
        </nav>
      </div>
      <div className="border-t border-zinc-200 px-6 py-3 text-center text-xs text-muted-foreground dark:border-zinc-800/60">
        SocialHan bir portfolyo / demo projesidir, ticari bir hizmet değildir. · A portfolio/demo project, not a commercial service.
      </div>
    </footer>
  );
}
