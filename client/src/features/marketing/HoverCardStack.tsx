import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface StackCard {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly meta?: string;
  readonly icon?: ReactNode;
}

interface HoverCardStackProps {
  readonly cards: readonly StackCard[];
  /** Vertical distance between cards, in rem. */
  readonly step?: number;
  /** How far each card drifts right, in rem. */
  readonly drift?: number;
  /** How far a card rises on hover, in rem. */
  readonly lift?: number;
  readonly className?: string;
}

/**
 * A skewed stack of overlapping cards; pointing at one raises it to the front.
 *
 * Deliberately CSS-only. Positions are per-card custom properties and hover
 * just swaps which one is used, so there is no JS on the interaction path and
 * no re-render — cheaper than driving the same effect through motion, which is
 * why this one is not a motion component like the rest of the landing.
 */
export function HoverCardStack({
  cards,
  step = 3.6,
  drift = 0.75,
  lift = 5.5,
  className,
}: HoverCardStackProps) {
  return (
    <div className={cn('relative w-full max-w-md', className)}>
      <div
        className="relative -skew-y-[8deg]"
        style={{ height: `${(cards.length - 1) * step + 11}rem` }}
      >
        {cards.map((card, i) => (
          <article
            key={card.id}
            tabIndex={0}
            style={
              {
                zIndex: i + 1,
                '--rest-x': `${i * drift}rem`,
                '--rest-y': `${i * step}rem`,
                '--lift-y': `${i * step - lift}rem`,
              } as CSSProperties
            }
            className={cn(
              'group absolute inset-x-0 top-0 rounded-xl p-5',
              'border border-border/60 bg-card/70 backdrop-blur-sm',
              'shadow-lg shadow-black/20',
              'translate-x-[var(--rest-x)] translate-y-[var(--rest-y)]',
              'transition-[translate,box-shadow,border-color] duration-300 ease-out',
              'hover:z-50 hover:translate-y-[var(--lift-y)] hover:border-primary/40',
              'focus-visible:z-50 focus-visible:translate-y-[var(--lift-y)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              'motion-reduce:transition-none'
            )}
          >
            <header className="flex items-center gap-2.5">
              {card.icon ? (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-muted-foreground transition-colors group-hover:bg-primary/20 group-hover:text-primary [&_svg]:size-4">
                  {card.icon}
                </span>
              ) : null}
              <h3 className="line-clamp-1 font-semibold text-foreground transition-colors group-hover:text-primary">
                {card.title}
              </h3>
            </header>

            <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {card.description}
            </p>

            {card.meta ? (
              <p className="mt-3 text-xs font-medium tabular-nums text-muted-foreground transition-colors group-hover:text-primary/80">{card.meta}</p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
