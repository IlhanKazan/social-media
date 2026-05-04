import { Card, CardHeader, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function PostSkeleton() {
  return (
    <Card className="border-x-0 border-t-0 border-b border-zinc-100 dark:border-zinc-800/50 ring-0 rounded-none shadow-none bg-transparent">
      <CardHeader className="flex flex-row items-start gap-3 p-3 pb-0">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex flex-col flex-1 gap-2 pt-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
          <div className="space-y-2 mt-2">
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-[90%] rounded-md" />
            <Skeleton className="h-4 w-[60%] rounded-md" />
          </div>
        </div>
      </CardHeader>
      <CardFooter className="p-0 pl-[3.5rem] pb-3 pt-4 bg-transparent border-t-0">
        <div className="flex items-center gap-8 w-full max-w-md">
          <Skeleton className="h-5 w-12 rounded-md" />
          <Skeleton className="h-5 w-12 rounded-md" />
        </div>
      </CardFooter>
    </Card>
  );
}
