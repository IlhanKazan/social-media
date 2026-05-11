import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Activity, Loader2, Search, FilterX } from 'lucide-react';
import { useAuditLog } from './hooks/use-audit-log';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { useDebounce } from '@/hooks/use-debounce';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function AdminAuditLogPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [actorIdFilter, setActorIdFilter] = useState('');
  const [selectedMeta, setSelectedMeta] = useState<Record<string, any> | null>(null);

  const debouncedActorId = useDebounce(actorIdFilter, 500);

  const filters = {
    action: actionFilter,
    targetType: targetTypeFilter,
    actorId: debouncedActorId,
  };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useAuditLog(filters);
  const { targetRef, isIntersecting } = useIntersectionObserver({ threshold: 0.5 });

  useEffect(() => {
    if (isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [isIntersecting, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const logs = data?.pages.flatMap(p => p.content) || [];

  // LINTER ÇÖZÜMÜ: İç içe ternary yerine bağımsız render bloğu
  const renderTableContent = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={5} className="text-center p-12">
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          </td>
        </tr>
      );
    }

    if (logs.length === 0) {
      return (
        <tr>
          <td colSpan={5} className="text-center p-12 text-muted-foreground">
            Kayıt bulunamadı.
          </td>
        </tr>
      );
    }

    return logs.map((log) => {
      // BACKEND TİP ÇÖZÜMÜ: Backend'den actorUsername ya da actor.username gelebilir. İkisini de yakala.
      // EĞER type hatası verirse use-audit-log.ts içindeki arayüze (actor?: { username: string }) ekle.
      const username = log.actorUsername || log.actor?.username;

      return (
        <tr key={log.id} className="hover:bg-muted/30 transition-colors">
          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
            {format(new Date(log.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}
          </td>
          <td className="px-4 py-3">
            {username ? (
              <span className="font-medium">@{username}</span>
            ) : (
              <span className="text-muted-foreground italic">Sistem</span>
            )}
          </td>
          <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
            {log.action}
          </td>
          <td className="px-4 py-3">
            {log.targetType} <span className="text-muted-foreground">#{log.targetId}</span>
          </td>
          <td className="px-4 py-3">
            {log.metadata && Object.keys(log.metadata).length > 0 ? (
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-xs font-medium"
                onClick={() => setSelectedMeta(log.metadata)}
              >
                Detayı Gör
              </Button>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Sistem Denetim Kayıtları</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <Input placeholder="Aksiyon (Örn: USER_BANNED)" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} />
        <Input placeholder="Hedef Tipi (Örn: ACCOUNT)" value={targetTypeFilter} onChange={(e) => setTargetTypeFilter(e.target.value)} />
        <Input type="number" placeholder="Kullanıcı ID" value={actorIdFilter} onChange={(e) => setActorIdFilter(e.target.value)} />
        <Button variant="outline" onClick={() => { setActionFilter(''); setTargetTypeFilter(''); setActorIdFilter(''); }}>
          <FilterX className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="px-4 py-3 font-medium">Tarih</th>
              <th className="px-4 py-3 font-medium">Aktör (Yapan)</th>
              <th className="px-4 py-3 font-medium">Aksiyon</th>
              <th className="px-4 py-3 font-medium">Hedef</th>
              <th className="px-4 py-3 font-medium">Ek Veri (Metadata)</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {renderTableContent()}
            </tbody>
          </table>
        </div>
      </div>

      <div ref={targetRef} className="h-10 flex items-center justify-center">
        {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      </div>

      <Dialog open={!!selectedMeta} onOpenChange={(open) => !open && setSelectedMeta(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Metadata Detayı</DialogTitle></DialogHeader>
          <div className="bg-zinc-950 rounded-xl p-4 mt-2 overflow-x-auto border border-zinc-800">
            <pre className="text-xs text-green-400 font-mono leading-relaxed">
              {JSON.stringify(selectedMeta, null, 2)}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
