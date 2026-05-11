import { Outlet, NavLink, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { LayoutDashboard, Settings, Users, ShieldAlert, LogOut, ArrowLeft, Activity, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function AdminLayout() {
  const account = useAuthStore((state) => state.account);
  const logout = useAuthStore((state) => state.logout);

  const navItems = [
    { name: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
    { name: 'Kuyruk', to: '/admin/moderation', icon: Filter, end: false },
    { name: 'Raporlar', to: '/admin/reports', icon: ShieldAlert, end: false },
    { name: 'Kullanıcılar', to: '/admin/users', icon: Users, end: false },
    { name: 'Sistem Ayarları', to: '/admin/settings', icon: Settings, end: false },
    { name: 'Audit Log', to: '/admin/audit-log', icon: Activity, end: false },
  ];

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden">

      <aside className="w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-background flex flex-col h-full z-10">
        <div className="flex h-16 items-center px-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <span className="font-bold text-lg tracking-tight">Admin Paneli</span>
        </div>

        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isActive
                    ? "bg-zinc-100 text-primary dark:bg-zinc-800/80"
                    : "text-muted-foreground hover:bg-zinc-50 hover:text-foreground dark:hover:bg-zinc-800/50"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3 shrink-0">
          <div className="px-1 text-sm text-muted-foreground truncate">
            <span className="block text-xs">Oturum:</span>
            <span className="font-medium text-foreground">@{account?.username}</span>
          </div>

          <div className="flex flex-col gap-2">
            <Link to="/" className="w-full block">
              <Button variant="outline" className="w-full justify-start gap-2">
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span className="truncate">Siteye Dön</span>
              </Button>
            </Link>

            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => void logout()}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="truncate">Çıkış Yap</span>
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 h-full overflow-y-auto relative">
        <div className="mx-auto max-w-6xl p-8">
          <Outlet />
        </div>
      </main>

    </div>
  );
}
