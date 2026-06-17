import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useConversations } from '@/features/messaging/hooks/use-conversations';
import { useSharePostToDm } from '@/features/messaging/hooks/use-dm-attachments';
import type { PostResponse } from '@/types/api';

interface ShareToDmDialogProps {
  readonly post: PostResponse;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function ShareToDmDialog({ post, open, onOpenChange }: ShareToDmDialogProps) {
  const [filter, setFilter] = useState('');
  const [caption, setCaption] = useState('');
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status } = useConversations(open);
  const share = useSharePostToDm();

  const conversations = data?.pages.flatMap((p) => p.content) ?? [];
  const term = filter.trim().toLowerCase();
  const filtered = term
    ? conversations.filter((c) =>
        c.otherParticipant.username.toLowerCase().includes(term) ||
        (c.otherParticipant.displayName ?? '').toLowerCase().includes(term))
    : conversations;

  const handleShare = (conversationId: number) => {
    share.mutate(
      { conversationId, postId: post.id, caption },
      { onSuccess: () => { setCaption(''); setFilter(''); onOpenChange(false); } },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Mesajla paylaş</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input placeholder="Sohbet ara..." value={filter} onChange={(e) => setFilter(e.target.value)} />

          <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
            {status === 'pending' && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {status !== 'pending' && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Sohbet bulunamadı</p>
            )}
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleShare(c.id)}
                disabled={share.isPending}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-left transition-colors disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={c.otherParticipant.profileImageUrl || undefined} />
                  <AvatarFallback>{c.otherParticipant.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-sm truncate">{c.otherParticipant.displayName || c.otherParticipant.username}</span>
                  <span className="text-xs text-muted-foreground truncate">@{c.otherParticipant.username}</span>
                </div>
              </button>
            ))}
            {hasNextPage && (
              <Button variant="ghost" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? 'Yükleniyor...' : 'Daha fazla'}
              </Button>
            )}
          </div>

          <Textarea
            placeholder="Bir not ekle (opsiyonel)..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="min-h-[60px] resize-none"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
