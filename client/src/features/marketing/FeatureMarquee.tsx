import type { CSSProperties, ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';

export interface MarqueeItem {
  readonly key: string;
  readonly icon: ReactNode;
  readonly title: string;
  readonly description: string;
}

/**
 * A continuously scrolling strip of feature cards that halts under the pointer.
 *
 * The track is rendered twice and translated by exactly half its width, so the
 * loop restarts on an identical frame and the seam is invisible. Animating the
 * transform of one long track — rather than each card — keeps this to a single
 * composited layer no matter how many items are in the list.
 *
 * Driven by a CSS keyframe rather than motion: `animation-play-state` pauses it
 * on hover without a re-render, which a JS-driven loop cannot do as cheaply.
 *
 * Pausing on hover matters for more than polish: text moving under the cursor
 * is unreadable and unclickable, so the strip stops the moment you engage with
 * it. It also stops entirely under reduced motion, where it falls back to a
 * plain horizontally scrollable row.
 */
export function FeatureMarquee({
  items,
  durationSeconds = 46,
}: {
  readonly items: readonly MarqueeItem[];
  readonly durationSeconds?: number;
}) {
  const reduceMotion = useReducedMotion();

  const card = (item: MarqueeItem, copy: number) => (
    <article
      key={`${copy}-${item.key}`}
      data-magnetic
      tabIndex={0}
      className="group w-[19rem] shrink-0 rounded-2xl border border-zinc-200 bg-card p-6 transition-colors hover:border-primary/40 focus-visible:border-primary/40 focus-visible:outline-none dark:border-zinc-800/60"
    >
      <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary/20 [&_svg]:h-6 [&_svg]:w-6">
        {item.icon}
      </div>
      <h3 className="font-bold text-foreground">{item.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
    </article>
  );

  if (reduceMotion) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map((item) => card(item, 0))}
      </div>
    );
  }

  return (
    <div
      className="marquee-wrap relative overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 6%, black 94%, transparent)',
      }}
    >
      <div
        className="marquee-track flex w-max gap-4"
        style={{ '--marquee-duration': `${durationSeconds}s` } as CSSProperties}
      >
        {[0, 1].map((copy) => (
          <div key={copy} className="flex gap-4">
            {items.map((item) => card(item, copy))}
          </div>
        ))}
      </div>
    </div>
  );
}
