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
    <aside className="sticky top-0 flex h-screen w-[68px] sm:w-20 xl:w-64 shrink-0 flex-col items-center py-4 sm:py-6 xl:items-stretch xl:px-4">
      {/* Logo */}
      <div className="mb-6 flex items-center justify-center xl:justify-start xl:px-2 gap-3 font-bold text-xl tracking-tight text-foreground">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md">
          <Zap className="h-5 w-5 fill-current" />
        </div>
        <span className="hidden xl:block">MicroBlog</span>
      </div>

      <nav className="flex flex-1 flex-col gap-2 w-full px-2 sm:px-0">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-center xl:justify-start gap-4 rounded-xl p-3 text-base font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                isActive ? "font-bold text-primary bg-zinc-100 dark:bg-zinc-800/50" : "text-muted-foreground"
              )
            }
          >
            <item.icon className="h-6 w-6 shrink-0" />
            <span className="hidden xl:block">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex w-full flex-col items-center gap-4 px-2 sm:px-0 xl:items-stretch">
        <div className="hidden items-center gap-3 px-2 xl:flex">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            {account?.profileImageUrl ? (
              <img src={account.profileImageUrl} alt="avatar" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <User className="h-5 w-5" />
              </div>
            )}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-bold">{account?.displayName || account?.username}</span>
            <span className="truncate text-xs text-muted-foreground">@{account?.username}</span>
          </div>
        </div>

        <Button
          variant="ghost"
          className="h-12 w-12 shrink-0 gap-3 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive xl:h-10 xl:w-full xl:justify-start xl:rounded-lg"
          onClick={() => logout()}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="hidden xl:block">Çıkış Yap</span>
        </Button>
      </div>
    </aside>
  );
}
