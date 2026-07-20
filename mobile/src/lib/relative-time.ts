import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// X-style short units (5sn/3dk/2s/4g) instead of date-fns's verbose
// "yaklaşık 3 saat önce" — pass `now` from useNow() so callers re-render live.
export function formatShortRelativeTime(input: Date | string, now: number = Date.now()): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const diffSec = Math.max(0, Math.floor((now - date.getTime()) / 1000));

  if (diffSec < 10) return 'şimdi';
  if (diffSec < 60) return `${diffSec}sn`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}dk`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}s`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}g`;

  return format(date, 'd MMM', { locale: tr });
}
