import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

interface AnimatedCheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label: ReactNode;
  readonly invalid?: boolean;
}

/**
 * A checkbox that draws its tick instead of snapping it on.
 *
 * The real `<input>` stays in the DOM — visually hidden, not replaced — so
 * keyboard operation, form submission and React Hook Form's `register()` ref
 * keep working untouched; the drawn box is decoration layered on top.
 *
 * The tick is stroked with CSS rather than a motion value because the input is
 * uncontrolled: React never sees the checked state, so only a selector on the
 * input itself (`peer-checked`) knows when to draw.
 */
export const AnimatedCheckbox = forwardRef<HTMLInputElement, AnimatedCheckboxProps>(
  function AnimatedCheckbox({ label, invalid, className, id, ...props }, ref) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const reduceMotion = useReducedMotion();

    return (
      <label
        htmlFor={inputId}
        className={cn('group flex cursor-pointer items-start gap-3 text-sm text-muted-foreground', className)}
      >
        <span className="relative mt-0.5 grid shrink-0 place-items-center">
          <input
            id={inputId}
            ref={ref}
            type="checkbox"
            className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            aria-invalid={invalid || undefined}
            {...props}
          />

          <motion.span
            aria-hidden
            className={cn(
              'grid h-[18px] w-[18px] place-items-center rounded-[5px] border-2',
              'border-zinc-300 transition-colors duration-200 dark:border-zinc-600',
              'peer-checked:border-primary peer-checked:bg-primary',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
              'peer-checked:[&_path]:[stroke-dashoffset:0]',
              invalid && 'border-destructive'
            )}
            whileTap={reduceMotion ? undefined : { scale: 0.86 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          >
            <svg viewBox="0 0 20 20" className="h-3 w-3 stroke-primary-foreground" fill="none" aria-hidden>
              <path
                d="M4 10.5 L8.2 14.5 L16 6"
                strokeWidth={2.75}
                strokeLinecap="round"
                strokeLinejoin="round"
                // Sweeps in along its own stroke: the dash is the full path
                // length and the offset animates to zero, so the tick is drawn
                // rather than faded in.
                style={{ strokeDasharray: 22, strokeDashoffset: 22 }}
                className="transition-[stroke-dashoffset] duration-300 ease-out motion-reduce:transition-none"
              />
            </svg>
          </motion.span>
        </span>

        <span className="leading-relaxed">{label}</span>
      </label>
    );
  }
);
