import { Skeleton } from '@/components/ui/skeleton';

export function NotificationSkeleton() {
  return (
    <div className="flex w-full text-left gap-3 border-b border-zinc-100 dark:border-zinc-800/50 p-4">
      <div className="flex shrink-0 items-start justify-end w-8 pt-1">
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <div className="flex flex-col w-full min-w-0 gap-2">
        <Skeleton className="h-8 w-8 rounded-full mb-1" />
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-3 w-20 mt-1 rounded-md" />
      </div>
    </div>
  );
}
