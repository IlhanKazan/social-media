import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

/**
 * Shows a form field once the step before it has been filled.
 *
 * Deliberately progressive rather than staged: everything already filled stays
 * on screen and editable, so this shortens the *apparent* form without hiding
 * anything or trapping someone who needs to go back and correct a field.
 *
 * `height: auto` is animated here even though the rest of the landing avoids
 * animating layout — a field appearing has to push the ones below it, and there
 * is no transform that does that. It is a handful of elements reacting to a
 * keystroke, not a scroll handler, so the cost is bounded.
 */
export function RevealField({
  show,
  children,
  className,
}: {
  readonly show: boolean;
  readonly children: ReactNode;
  /**
   * Spacing for the fields inside. The form's own `space-y` only reaches its
   * direct children, so a step wrapping more than one field has to space them
   * itself — without this they sit flush against each other.
   */
  readonly className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return show ? <div className={className}>{children}</div> : null;
  }

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0, y: -6 }}
          animate={{ opacity: 1, height: 'auto', y: 0 }}
          exit={{ opacity: 0, height: 0, y: -6 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          // Clipped while collapsing so the contents never spill past the
          // shrinking box mid-transition.
          style={{ overflow: 'hidden' }}
        >
          <div className={className}>{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
