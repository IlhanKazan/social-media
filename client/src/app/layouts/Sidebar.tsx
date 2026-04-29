import { NavLink } from 'react-router-dom';
import { Home, Compass, Bell, Mail, User, Settings, LogOut, Zap } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function Sidebar() {
  const account = useAuthStore((state) => state.account);
  const logout = useAuthStore((state) => state.logout);

  const navItems = [
    { name: 'Akış', to: '/', icon: Home },
    { name: 'Keşfet', to: '/explore', icon: Compass },
    { name: 'Bildirimler', to: '/notifications', icon: Bell },
    { name: 'Mesajlar', to: '/messages', icon: Mail },
    { name: 'Profil', to: `/u/${account?.username}`, icon: User },
    { name: 'Ayarlar', to: '/settings', icon: Settings },
  ];

  return (
    <aside className="sticky top-0 flex h-screen w-20 flex-col items-center border-r bg-card py-6 xl:w-64 xl:items-stretch xl:px-4">
      {/* Logo */}
      <div className="mb-8 flex items-center justify-center xl:justify-start xl:px-2 gap-3 font-bold text-xl tracking-tight text-foreground">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md">
          <Zap className="h-5 w-5 fill-current" />
        </div>
        <span className="hidden xl:block">MicroBlog</span>
      </div>

      <nav className="flex-1 space-y-2 w-full">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-center xl:justify-start gap-4 rounded-xl px-3 py-3 text-base font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                isActive ? "font-bold text-primary bg-zinc-100 dark:bg-zinc-800/50" : "text-muted-foreground"
              )
            }
          >
            <item.icon className="h-6 w-6" />
            <span className="hidden xl:block">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col items-center xl:items-stretch gap-4 border-t pt-6 w-full">
        <div className="hidden xl:flex items-center gap-3 px-2">
          <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden shrink-0">
            {account?.profileImageUrl ? (
              <img src={account.profileImageUrl} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <User className="h-5 w-5" />
              </div>
            )}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold truncate">{account?.displayName || account?.username}</span>
            <span className="text-xs text-muted-foreground truncate">@{account?.username}</span>
          </div>
        </div>

        <Button
          variant="ghost"
          className="w-12 h-12 xl:w-full xl:h-10 xl:justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => logout()}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="hidden xl:block">Çıkış Yap</span>
        </Button>
      </div>
    </aside>
  );
}
