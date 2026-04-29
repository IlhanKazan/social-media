import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background justify-center">
      <Sidebar />

      <main className="flex-1 max-w-[600px] w-full border-x border-zinc-100 dark:border-zinc-800/50 min-h-screen">
        <div className="w-full">
          <Outlet />
        </div>
      </main>

      <aside className="hidden lg:block w-80 p-6">
        <div className="sticky top-6">
          <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/50 p-4 border border-zinc-100 dark:border-zinc-800/50">
            <h3 className="font-bold mb-2">Kimi Takip Etmeli</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Önerilen kullanıcılar ve trendler modülü yakında eklenecek.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
