import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+=<>/\\';

/**
 * Resolves out of noise on hover, one character at a time.
 *
 * The real string stays in the DOM for assistive technology and for selection;
 * only a visually-hidden copy is scrambled, so nothing a screen reader reads is
 * ever gibberish. Spaces are never scrambled — keeping word boundaries intact is
 * what makes it read as decryption rather than as a broken render.
 *
 * Suits a line about security specifically: the effect is the idea, not
 * decoration bolted onto an unrelated sentence.
 */
export function ScrambleText({ text, className }: { readonly text: string; readonly className?: string }) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(text);
  const frame = useRef<number | null>(null);

  // Only cleanup here. Resetting `display` when `text` changes is handled by
  // remounting on a key at the call site, which keeps this effect free of the
  // synchronous setState the lint rule (rightly) rejects.
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    []
  );

  const scramble = () => {
    if (reduceMotion) return;
    let tick = 0;

    const run = () => {
      // Each character locks in after its own short delay, so the string
      // resolves left to right instead of snapping all at once.
      const next = text
        .split('')
        .map((char, i) => {
          if (char === ' ') return ' ';
          if (tick > i * 1.6) return char;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join('');

      setDisplay(next);
      tick += 1;

      if (tick <= text.length * 1.6 + 2) {
        frame.current = requestAnimationFrame(run);
      } else {
        setDisplay(text);
      }
    };

    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(run);
  };

  if (reduceMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={cn('cursor-default', className)} onPointerEnter={scramble} onFocus={scramble} tabIndex={0}>
      <span aria-hidden className="font-mono tabular-nums">{display}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
