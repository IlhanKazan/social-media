import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'motion/react';

const TARGETS = 'a, button, [role="button"], [data-magnetic]';

interface Snapped {
  readonly width: number;
  readonly height: number;
  readonly radius: number;
}

/**
 * A cursor that wraps whatever it is pointing at.
 *
 * Off a target it is a small ring trailing a dot. Over one it morphs into that
 * element's own footprint — its width, height and border radius — so the button
 * looks outlined by the cursor rather than sitting behind a circle. That
 * difference is the whole point: a circle centred on a wide button reads as a
 * miss, a rounded rectangle matching it reads as a lock-on.
 *
 * `mix-blend-difference` keeps it legible over both the page and the button it
 * is covering, without needing to know either colour.
 *
 * Position and size run through motion values and springs, so React re-renders
 * only when the pointer enters or leaves a target — never per frame.
 */
export function MagneticCursor() {
  const reduceMotion = useReducedMotion();
  // Whether a fine pointer exists cannot change during the component's life,
  // so it is resolved once at mount rather than from an effect.
  const [enabled] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches
  );
  const [snapped, setSnapped] = useState<Snapped | null>(null);
  const [pressed, setPressed] = useState(false);
  const currentTarget = useRef<Element | null>(null);

  const x = useMotionValue(-200);
  const y = useMotionValue(-200);

  const dotX = useSpring(x, { stiffness: 950, damping: 42, mass: 0.2 });
  const dotY = useSpring(y, { stiffness: 950, damping: 42, mass: 0.2 });
  // Softer, so the outline lags behind the pointer and reads as having weight.
  const ringX = useSpring(x, { stiffness: 260, damping: 24, mass: 0.55 });
  const ringY = useSpring(y, { stiffness: 260, damping: 24, mass: 0.55 });

  useEffect(() => {
    if (!enabled || reduceMotion) return;

    const move = (event: PointerEvent) => {
      const target = (event.target as Element | null)?.closest?.(TARGETS) ?? null;

      if (target) {
        // Locked, not tracked. Feeding the pointer back in while a spring is
        // running means the outline chases the hand for as long as it stays on
        // the button and never settles — which reads as jitter, not as a grip.
        // Position is written once per target and then left alone.
        if (currentTarget.current !== target) {
          currentTarget.current = target;
          const rect = target.getBoundingClientRect();
          x.set(rect.left + rect.width / 2);
          y.set(rect.top + rect.height / 2);
          const radius = parseFloat(getComputedStyle(target).borderRadius) || 8;
          // Exactly the element's box: padding here reads as the cursor missing
          // rather than gripping it.
          setSnapped({ width: rect.width, height: rect.height, radius });
        }
        return;
      }

      x.set(event.clientX);
      y.set(event.clientY);
      if (currentTarget.current) {
        currentTarget.current = null;
        setSnapped(null);
      }
    };

    const down = () => setPressed(true);
    const up = () => setPressed(false);

    // The outline is positioned in viewport coordinates and only rewritten when
    // the target changes, so scrolling would otherwise leave it behind the
    // element it is supposed to be gripping.
    const reposition = () => {
      const target = currentTarget.current;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      x.set(rect.left + rect.width / 2);
      y.set(rect.top + rect.height / 2);
    };

    window.addEventListener('scroll', reposition, { passive: true });
    window.addEventListener('resize', reposition, { passive: true });
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    return () => {
      window.removeEventListener('scroll', reposition);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
    };
  }, [enabled, reduceMotion, x, y]);

  if (!enabled || reduceMotion) return null;

  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[60] h-1.5 w-1.5 rounded-full bg-white mix-blend-difference"
        style={{ x: dotX, y: dotY, translateX: '-50%', translateY: '-50%' }}
        animate={{ opacity: snapped ? 0 : 1, scale: pressed ? 0.5 : 1 }}
        transition={{ duration: 0.16 }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[60] border-2 border-white mix-blend-difference"
        style={{ x: ringX, y: ringY, translateX: '-50%', translateY: '-50%' }}
        animate={{
          width: snapped?.width ?? 28,
          height: snapped?.height ?? 28,
          borderRadius: snapped?.radius ?? 999,
          opacity: snapped ? 1 : 0.55,
          scale: pressed ? 0.94 : 1,
        }}
        transition={{ type: 'spring', stiffness: 340, damping: 30, mass: 0.5 }}
      />
    </>
  );
}
