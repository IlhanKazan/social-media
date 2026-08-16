import { Fragment } from 'react';
import { motion, useReducedMotion } from 'motion/react';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Reveals a headline word by word.
 *
 * Words, not characters: a per-character stagger on a long headline produces
 * dozens of animated nodes and reads as a gimmick, while per-word keeps the
 * line legible as it arrives. Each word is inline-block so only its own
 * transform moves — the line box never reflows.
 *
 * The full string stays in `aria-label` and the pieces are hidden from
 * assistive technology, so a screen reader hears one sentence rather than a
 * stream of fragments.
 */
export function WordReveal({ text, className }: { readonly text: string; readonly className?: string }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <h1 className={className}>{text}</h1>;
  }

  const words = text.split(' ');

  return (
    <h1 className={className} aria-label={text}>
      {words.map((word, i) => (
        // The separator sits outside the span deliberately: trailing whitespace
        // inside an inline-block is collapsed away, which ran every word of the
        // headline together.
        <Fragment key={`${word}-${i}`}>
          <motion.span
            aria-hidden
            className="inline-block"
            initial={{ opacity: 0, y: '0.4em' }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 + i * 0.045, ease: EASE }}
          >
            {word}
          </motion.span>
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </h1>
  );
}
