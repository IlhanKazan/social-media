import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

// Only transform and opacity are animated: both are composited off the main
// thread, so a scroll-driven reveal costs no layout work. Anything that moved
// width, height or margin here would make the page feel heavy on mid-range
// phones — the one thing this pass is not allowed to do.
const EASE = [0.22, 1, 0.36, 1] as const;

interface ScrollRevealProps {
  readonly children: ReactNode;
  readonly delay?: number;
  readonly className?: string;
}

/** Fades and lifts its child the first time it scrolls into view. */
export function ScrollReveal({ children, delay = 0, className }: ScrollRevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Reveals a paragraph one line at a time as it enters the viewport.
 *
 * Each line is its own block rather than a split-by-character effect: the text
 * stays selectable, screen readers read it as ordinary prose, and there is no
 * layout thrash from re-measuring word boxes.
 */
export function RevealLines({ lines }: { readonly lines: string[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col gap-5">
      {lines.map((line, i) =>
        reduceMotion ? (
          <p key={line} className="text-balance text-xl leading-relaxed text-foreground sm:text-2xl">
            {line}
          </p>
        ) : (
          <motion.p
            key={line}
            className="text-balance text-xl leading-relaxed text-foreground sm:text-2xl"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.65, delay: i * 0.12, ease: EASE }}
          >
            {line}
          </motion.p>
        )
      )}
    </div>
  );
}
