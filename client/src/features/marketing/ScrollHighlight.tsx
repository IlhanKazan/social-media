import { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from 'motion/react';

// Words start dim and light up as the block travels through the viewport, so the
// reader's eye is pulled down the passage rather than meeting a wall of text.
// Only `color` animates — no transform, no layout — so the effect costs nothing
// on scroll beyond a style write per word.

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const color = useTransform(
    progress,
    range,
    ['var(--sh-dim)', 'var(--sh-lit)']
  );
  return (
    <motion.span style={{ color }} className="transition-colors">
      {children}{' '}
    </motion.span>
  );
}

export function ScrollHighlight({ text, className }: { readonly text: string; readonly className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    // Completes while the block's end is still well below the fold. Ending on
    // 'end 0.55' meant the last words only lit once the paragraph had scrolled
    // past the middle of the screen — which never happens for a block sitting
    // near the bottom of the page, so its tail stayed permanently dim.
    offset: ['start 0.9', 'end 0.85'],
  });

  const words = text.split(' ');

  if (reduceMotion) {
    return <p className={className}>{text}</p>;
  }

  return (
    <p
      ref={ref}
      className={className}
      style={
        {
          '--sh-dim': 'color-mix(in oklab, var(--color-foreground) 28%, transparent)',
          '--sh-lit': 'var(--color-foreground)',
        } as React.CSSProperties
      }
    >
      {words.map((word, i) => {
        const start = i / words.length;
        const end = (i + 1) / words.length;
        return (
          <Word key={`${word}-${i}`} progress={scrollYProgress} range={[start, end]}>
            {word}
          </Word>
        );
      })}
    </p>
  );
}
