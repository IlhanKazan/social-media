import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Compass, Bell, Mail, User, Settings, LogOut, Search, ShieldHalf } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {useUnreadMessageCount} from "@/features/messaging/hooks/use-messages.ts";

export function Sidebar() {
  const account = useAuthStore((state) => state.account);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const { data: unreadMessageCount = 0 } = useUnreadMessageCount();

  const navItems: { name: string; to: string; icon: typeof Home; badge?: number }[] = account
    ? [
        { name: 'Akış', to: '/home', icon: Home },
        { name: 'Ara', to: '/search', icon: Search },
        { name: 'Keşfet', to: '/explore', icon: Compass },
        { name: 'Bildirimler', to: '/notifications', icon: Bell, badge: unreadCount },
        { name: 'Mesajlar', to: '/messages', icon: Mail, badge: unreadMessageCount },
        { name: 'Profil', to: `/u/${account.username}`, icon: User },
        { name: 'Ayarlar', to: '/settings', icon: Settings },
      ]
    : [
        { name: 'Keşfet', to: '/explore', icon: Compass },
        { name: 'Ara', to: '/search', icon: Search },
      ];

  return (
    <aside className="hidden md:flex sticky top-0 h-[100dvh] w-20 xl:w-64 shrink-0 flex-col items-center py-6 xl:items-stretch xl:px-4">
      <div className="mb-6 flex items-center justify-center xl:justify-start xl:px-2 gap-3 font-bold text-xl tracking-tight text-foreground">
        <img src="/logo.svg" alt="SocialHan" className="h-8 w-8 shrink-0 rounded-lg shadow-md" />
        <span className="hidden xl:block">SocialHan</span>
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
            <div className="relative flex items-center justify-center">
              <item.icon className="h-6 w-6 shrink-0" />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
            <span className="hidden xl:block">{item.name}</span>
          </NavLink>
        ))}

        {account?.role === 'ROLE_ADMIN' && (
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800/50">
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-center xl:justify-start gap-4 rounded-xl p-3 text-base font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800/50",
                  isActive ? "font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10" : "text-muted-foreground"
                )
              }
            >
              <div className="relative flex items-center justify-center">
                <ShieldHalf className="h-6 w-6 shrink-0" />
              </div>
              <span className="hidden xl:block text-indigo-600 dark:text-indigo-400 font-bold">Admin Paneli</span>
            </NavLink>
          </div>
        )}
      </nav>

      <div className="mt-auto flex w-full flex-col items-center gap-4 px-2 sm:px-0 xl:items-stretch">
        {account ? (
          <>
            <div className="hidden items-center gap-3 px-2 xl:flex">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                {account.profileImageUrl ? (
                  <img src={account.profileImageUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <User className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-sm font-bold">{account.displayName || account.username}</span>
                <span className="truncate text-xs text-muted-foreground">@{account.username}</span>
              </div>
            </div>

            <Button
              variant="ghost"
              className="h-12 w-12 shrink-0 gap-3 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive xl:h-10 xl:w-full xl:justify-start xl:rounded-lg"
              onClick={() => void logout()}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className="hidden xl:block">Çıkış Yap</span>
            </Button>
          </>
        ) : (
          <div className="flex w-full flex-col items-center gap-2 xl:items-stretch">
            <Button className="h-12 w-12 rounded-full xl:h-10 xl:w-full xl:rounded-lg" onClick={() => navigate('/register')}>
              <User className="h-5 w-5 shrink-0 xl:hidden" />
              <span className="hidden xl:block">Kaydol</span>
            </Button>
            <Button
              variant="outline"
              className="hidden h-10 w-full rounded-lg xl:block"
              onClick={() => navigate('/login')}
            >
              Giriş yap
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
