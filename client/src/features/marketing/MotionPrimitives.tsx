import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const EASE = [0.22, 1, 0.36, 1] as const;

// A spring rather than a duration: pointer feedback should track the pointer,
// and a fixed-length tween always feels either sluggish on press or clipped on
// release. Stiffness/damping tuned to settle without visible overshoot.
const PRESS_SPRING = { type: 'spring', stiffness: 420, damping: 26 } as const;

/**
 * Wraps a call to action so it lifts on hover and gives under the press.
 * Scales the wrapper, never the button's box, so no layout is recalculated.
 */
export function PressableCta({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      whileHover={{ scale: 1.035, y: -2 }}
      whileTap={{ scale: 0.97, y: 0 }}
      transition={PRESS_SPRING}
    >
      {children}
    </motion.div>
  );
}

/**
 * Feature tile: reveals on scroll, then lifts when pointed at.
 *
 * `whileInView` and `whileHover` live on the same element deliberately — motion
 * merges them, so the tile keeps its hover response after the reveal has run
 * instead of being frozen at its final keyframe.
 */
export function FeatureTile({
  children,
  index,
  className,
}: {
  children: ReactNode;
  index: number;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.55, delay: index * 0.09, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Reveals a headline word by word.
 *
 * Words, not characters: a per-character stagger on a long Turkish headline
 * produces dozens of animated nodes and reads as a gimmick, while per-word
 * keeps the line legible as it arrives. Each word is inline-block so only its
 * own transform moves — the line box never reflows.
 */
export function WordReveal({ text, className }: { text: string; className?: string }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <h1 className={className}>{text}</h1>;
  }

  const words = text.split(' ');

  return (
    <h1 className={className} aria-label={text}>
      {words.map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          aria-hidden
          className="inline-block"
          initial={{ opacity: 0, y: '0.4em' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 + i * 0.045, ease: EASE }}
        >
          {word}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </h1>
  );
}
