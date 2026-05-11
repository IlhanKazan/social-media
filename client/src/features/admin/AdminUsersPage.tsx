import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { User, ShieldAlert, LogOut, Ban, CheckCircle2, MoreVertical, Loader2, Search, FilterX, ShieldCheck, ShieldOff, KeyRound } from 'lucide-react';
import { useAdminUsers, useAdminUserActions, type AdminUserDto } from './hooks/use-admin-users';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { useDebounce } from '@/hooks/use-debounce';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const debouncedSearch = useDebounce(search, 500);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useAdminUsers({
    search: debouncedSearch,
    status: status
  });

  const { banUser, unbanUser, forceLogout, promoteUser, demoteUser, resetPassword } = useAdminUserActions();
  const { targetRef, isIntersecting } = useIntersectionObserver({ threshold: 0.5 });

  const [banTarget, setBanTarget] = useState<AdminUserDto | null>(null);
  const [banReason, setBanReason] = useState('');

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const users = data?.pages.flatMap(p => p.content) || [];

  const renderUserCards = () => {
    if (isLoading) return <div className="col-span-full flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
    if (users.length === 0) return <div className="col-span-full p-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">Kullanıcı bulunamadı.</div>;

    return users.map((user) => (
      <Card key={user.id} className="p-5 flex flex-col justify-between border-zinc-200 dark:border-zinc-800 shadow-sm bg-card">
        <div>
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200 dark:border-zinc-700">
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-400">
                    <User className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate font-bold text-foreground flex items-center gap-1.5">
                  {user.displayName || user.username}
                  {user.role === 'ROLE_ADMIN' && (
                    <span title="Admin" className="flex items-center">
                      <ShieldAlert className="h-3.5 w-3.5 text-indigo-500" />
                    </span>
                  )}
                </span>

                <span className="truncate text-[11px] font-mono text-muted-foreground">
                  ID: #{user.id} • @{user.username}
                </span>

                <span className="truncate text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  {user.email}
                  {user.emailVerified && (
                  <span title="Doğrulanmış E-posta" className="flex items-center">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  </span>
                  )}
                </span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 outline-none transition-colors border border-transparent focus:border-zinc-300">
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Yönetimsel İşlemler</DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  {user.role === 'ROLE_ADMIN' ? (
                    <DropdownMenuItem onClick={() => demoteUser.mutate(user.id)} className="text-amber-600">
                      <ShieldOff className="mr-2 h-4 w-4" /> Yetkiyi Geri Al
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => promoteUser.mutate(user.id)} className="text-indigo-600">
                      <ShieldCheck className="mr-2 h-4 w-4" /> Admin Yap
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem onClick={() => resetPassword.mutate(user.id)}>
                    <KeyRound className="mr-2 h-4 w-4" /> Şifre Sıfırla
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => forceLogout.mutate(user.id)}>
                    <LogOut className="mr-2 h-4 w-4" /> Oturumları Kapat
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {user.isBanned ? (
                    <DropdownMenuItem onClick={() => unbanUser.mutate(user.id)} className="text-green-600 font-bold">
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Yasağı Kaldır
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => setBanTarget(user)} className="text-destructive font-bold">
                      <Ban className="mr-2 h-4 w-4" /> Kullanıcıyı Banla
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2 text-[13px] text-muted-foreground">
            <div className="flex justify-between items-center">
              <span>Durum</span>
              {user.isBanned ? (
                <Badge variant="destructive">Banlı</Badge>
              ) : (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none">Aktif</Badge>
              )}
            </div>
            <div className="flex justify-between">
              <span>Gönderi</span>
              <span className="font-medium text-foreground">{user.postCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Kayıt</span>
              <span className="text-foreground">{user.joinedAt ? format(new Date(user.joinedAt), 'dd MMM yyyy', { locale: tr }) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span>Son Giriş</span>
              <span className="text-foreground italic">
                {user.lastLoginAt ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true, locale: tr }) : 'Hiç giriş yapmadı'}
              </span>
            </div>
          </div>
        </div>
      </Card>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Kullanıcı Yönetimi</h1>
        <p className="text-muted-foreground">Sistemdeki hesapları filtreleyin ve ADMIN yetkilerini yönetin.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="relative flex-[2]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            className="pl-9 h-10 border-zinc-200 dark:border-zinc-800 bg-background text-foreground"
            placeholder="Ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1 flex gap-2">
          <select
            className="h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all" className="bg-background text-foreground">Tüm Durumlar</option>
            <option value="active" className="bg-background text-emerald-600">Sadece Aktifler</option>
            <option value="banned" className="bg-background text-destructive">Sadece Banlılar</option>
          </select>
          <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => { setSearch(''); setStatus('all'); }}>
            <FilterX className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {renderUserCards()}
      </div>

      <div ref={targetRef} className="h-20 flex items-center justify-center">
        {isFetchingNextPage && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
      </div>

      <Dialog open={!!banTarget} onOpenChange={(open) => !open && setBanTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Kullanıcıyı Yasakla</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm"><strong>@{banTarget?.username}</strong> kullanıcısı yasaklanacak.</p>
            <Input
              placeholder="Sebep girin..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="bg-background text-foreground border-zinc-200 dark:border-zinc-800"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBanTarget(null)}>İptal</Button>
            <Button
              variant="destructive"
              onClick={() => banTarget && banReason.trim() && banUser.mutate({ id: banTarget.id, reason: banReason }, { onSuccess: () => setBanTarget(null) })}
              disabled={!banReason.trim() || banUser.isPending}
            >
              Yasakla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
