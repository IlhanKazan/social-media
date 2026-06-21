import { Link, Outlet } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Footer } from './Footer';

export function LegalLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-zinc-200 dark:border-zinc-800/60">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight text-foreground">
            <img src="/logo.svg" alt="SocialHan" className="h-8 w-8 rounded-lg" />
            SocialHan
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Ana sayfa
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
