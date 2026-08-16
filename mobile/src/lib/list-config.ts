/**
 * Shared virtualisation settings for every long list in the app.
 *
 * FlatList's defaults are tuned for lists that end. An infinite feed on a
 * mid-range phone is a different problem: `windowSize` of 21 keeps ten screens
 * of rendered rows above and below the viewport, and each row here holds an
 * avatar, an image and interaction state. Left alone, scrolling a feed for a
 * few minutes grows the view tree until the app is killed for memory.
 *
 * Applied through a shared object rather than per screen so the numbers are
 * tuned in one place and no list is accidentally left on the defaults.
 */
export const LIST_PERF = {
  /** Four screens of rows instead of twenty. */
  windowSize: 5,
  /** Rendered before the first paint — one screenful is enough. */
  initialNumToRender: 8,
  /** Per batch while scrolling; smaller batches keep frames from being dropped. */
  maxToRenderPerBatch: 8,
  /** Detaches off-screen rows from the native view hierarchy on Android. */
  removeClippedSubviews: true,
  /** Yields to the gesture between batches, so scrolling stays smooth. */
  updateCellsBatchingPeriod: 60,
} as const;

/**
 * Cap on how many pages an infinite query keeps.
 *
 * Without it every page ever fetched stays in the cache, so a long scroll holds
 * hundreds of posts in memory long after they have left the screen. Ten pages
 * of twenty is far more than anyone scrolls back through, and older pages are
 * refetched if they do.
 */
export const MAX_CACHED_PAGES = 10;
