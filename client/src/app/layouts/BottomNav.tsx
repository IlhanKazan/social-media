import { NavLink, useMatch } from 'react-router-dom';
import { Home, Search, Bell, Mail, Compass, User } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function BottomNav() {
  const account = useAuthStore((state) => state.account);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const match = useMatch('/messages/:conversationId');

  if (match) return null;

  const navItems: { to: string; icon: typeof Home; badge?: number }[] = account
    ? [
        { to: '/home', icon: Home },
        { to: '/search', icon: Search },
        { to: '/notifications', icon: Bell, badge: unreadCount },
        { to: '/messages', icon: Mail },
      ]
    : [
        { to: '/explore', icon: Compass },
        { to: '/search', icon: Search },
      ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-zinc-100 dark:border-zinc-800/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-14 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "relative flex h-full flex-1 items-center justify-center transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )
          }
        >
          <item.icon className="h-6 w-6" />
          {item.badge !== undefined && item.badge > 0 && (
            <span className="absolute top-2 right-1/2 -mr-3 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
        </NavLink>
      ))}

      {account ? (
        <NavLink
          to={`/u/${account.username}`}
          className={({ isActive }) =>
            cn(
              "flex h-full flex-1 items-center justify-center transition-opacity",
              isActive ? "opacity-100" : "opacity-70 hover:opacity-100"
            )
          }
        >
          {({ isActive }) => (
            <div className={cn("rounded-full transition-shadow", isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>
              <Avatar className="h-7 w-7 shrink-0 block">
                <AvatarImage src={account.profileImageUrl || undefined} />
                <AvatarFallback>{account.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          )}
        </NavLink>
      ) : (
        <NavLink
          to="/login"
          className={({ isActive }) =>
            cn(
              "relative flex h-full flex-1 items-center justify-center transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )
          }
        >
          <User className="h-6 w-6" />
        </NavLink>
      )}
    </nav>
  );
}
