import { useEffect, useState } from 'react';

// Forces a periodic re-render so components displaying a relative time
// (e.g. formatShortRelativeTime) don't freeze at whatever value they
// first rendered with.
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
