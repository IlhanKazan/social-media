import type {ReactNode} from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  readonly icon?: ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly className?: string;
}

export function EmptyState({ icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 md:p-12 text-center animate-in fade-in duration-500", className)}>
      {icon && <div className="mb-4 text-muted-foreground/30">{icon}</div>}
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      {description && <p className="mt-2 text-[15px] text-muted-foreground max-w-sm leading-relaxed">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="outline" className="mt-6 rounded-full font-medium" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
