import { format } from 'date-fns';
import { enUS, tr } from 'date-fns/locale';
import type { TFunction } from 'i18next';

// X-style short units (5sn/3dk/2s/4g or 5s/3m/2h/4d) instead of date-fns's
// verbose "yaklaşık 3 saat önce" — pass `now` from useNow() so callers re-render live.
export function formatShortRelativeTime(
  input: Date | string,
  now: number,
  t: TFunction,
  language: string
): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const diffSec = Math.max(0, Math.floor((now - date.getTime()) / 1000));

  if (diffSec < 10) return t('time.now');
  if (diffSec < 60) return t('time.seconds', { count: diffSec });

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return t('time.minutes', { count: diffMin });

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return t('time.hours', { count: diffHour });

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return t('time.days', { count: diffDay });

  return format(date, 'd MMM', { locale: language === 'en' ? enUS : tr });
}
