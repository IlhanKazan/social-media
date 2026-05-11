import { useEffect } from 'react';
import { useModerationQueue, useModerationActions } from './hooks/use-moderation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, User, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

export function AdminModerationPage() {
  const { data, isLoading, fetchNextPage, hasNextPage } = useModerationQueue();
  const { approve, remove } = useModerationActions();

  const posts = data?.pages.flatMap(p => p.content) || [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!posts || posts.length === 0) return;

      const targetPost = posts[0];
      if (!targetPost) return;

      if (e.key.toLowerCase() === 'a') {
        approve.mutate(targetPost.id);
      } else if (e.key.toLowerCase() === 'r') {
        remove.mutate(targetPost.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [posts, approve, remove]);

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Moderasyon Kuyruğu</h1>
        <div className="text-xs text-muted-foreground bg-zinc-100 dark:bg-zinc-800/50 px-3 py-1.5 rounded-md font-medium">
          Kısayollar: <kbd className="font-bold text-primary mx-1">A</kbd> Onayla | <kbd className="font-bold text-destructive mx-1">R</kbd> Kaldır
        </div>
      </div>

      <div className="grid gap-4">
        {posts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
            Kuyruk tertemiz! Bekleyen içerik yok.
          </div>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="p-5 border-zinc-200 dark:border-zinc-800">
              <div className="flex gap-5">
                <div className="flex-1 space-y-3 min-w-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span className="font-bold text-foreground">@{post.author.username}</span>
                    <span>•</span>
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: tr })}</span>
                  </div>
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  {post.imageUrl && (
                    <img src={post.imageUrl} alt="Moderation attachment" className="rounded-xl max-h-64 object-cover border border-zinc-200 dark:border-zinc-800" />
                  )}
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white font-medium"
                    onClick={() => approve.mutate(post.id)}
                    disabled={approve.isPending}
                  >
                    <Check className="h-4 w-4 mr-2" /> Onayla (A)
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="font-medium"
                    onClick={() => remove.mutate(post.id)}
                    disabled={remove.isPending}
                  >
                    <X className="h-4 w-4 mr-2" /> Kaldır (R)
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {hasNextPage && (
        <Button variant="outline" className="w-full" onClick={() => fetchNextPage()}>Daha Fazla Yükle</Button>
      )}
    </div>
  );
}
