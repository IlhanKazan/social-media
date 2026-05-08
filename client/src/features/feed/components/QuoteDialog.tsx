import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { PostResponse } from '@/types/api';

interface QuoteDialogProps {
  post: PostResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuoteDialog({ post, open, onOpenChange }: QuoteDialogProps) {
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  const quoteMutation = useMutation({
    mutationFn: async (text: string) => {
      const { data } = await api.post(`/posts/${post.id}/quote-repost`, {
        content: text,
        quotedPostId: post.id,
      });
      return data;
    },
    onSuccess: () => {
      setContent('');
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['profile-feed'] });
      toast.success('Alıntı paylaşıldı');
      setContent('');
      onOpenChange(false);
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) return;
    quoteMutation.mutate(content);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Alıntı ile Paylaş</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <Textarea
            placeholder="Alıntıya düşüncelerini ekle..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] mt-4 p-4 text-base resize-none border-none focus-visible:ring-0"
          />
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 opacity-70 pointer-events-none">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-sm">{post.author.displayName || post.author.username}</span>
              <span className="text-xs text-muted-foreground">@{post.author.username}</span>
            </div>
            <p className="text-sm line-clamp-3">{post.content}</p>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || quoteMutation.isPending}
              className="rounded-full px-6"
            >
              Paylaş
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
