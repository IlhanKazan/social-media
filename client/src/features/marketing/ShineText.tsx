import { useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

/**
 * A highlight that sweeps across the text once it scrolls into view.
 *
 * Implemented as a moving background clipped to the glyphs rather than an
 * overlaid gradient element: there is nothing to position over the text, it
 * survives line wrapping, and selection still works. Falls back to plain
 * foreground colour when the sweep would be unwelcome — a moving specular
 * highlight is exactly the kind of thing reduced-motion users switch off.
 */
export function ShineText({
  children,
  className,
  as: Tag = 'span',
}: {
  readonly children: string;
  readonly className?: string;
  readonly as?: 'span' | 'h2' | 'h3' | 'p';
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Tag className={cn('shine-text', className)} data-shine>
      {children}
    </Tag>
  );
}
