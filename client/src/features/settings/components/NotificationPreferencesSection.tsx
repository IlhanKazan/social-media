import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationPreferences } from '@/types/api';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '../hooks/use-notification-preferences';

const ROWS: ReadonlyArray<{ key: keyof NotificationPreferences; label: string }> = [
  { key: 'likes', label: 'Beğeniler' },
  { key: 'reposts', label: 'Yeniden paylaşımlar' },
  { key: 'follows', label: 'Yeni takipçiler' },
  { key: 'replies', label: 'Yanıtlar' },
  { key: 'mentions', label: 'Bahsetmeler' },
  { key: 'recommendations', label: 'Senin için öneriler' },
];

export function NotificationPreferencesSection() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  const toggle = (key: keyof NotificationPreferences) => {
    if (!prefs) return;
    update.mutate({ ...prefs, [key]: !prefs[key] });
  };

  return (
    <div className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-card space-y-3">
      {isLoading || !prefs ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        ROWS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm font-medium">{label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[key]}
              aria-label={label}
              onClick={() => toggle(key)}
              disabled={update.isPending}
              className={cn(
                'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60',
                prefs[key] ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'
              )}
            >
              <span
                className={cn(
                  'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  prefs[key] ? 'translate-x-[22px]' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        ))
      )}
    </div>
  );
}
