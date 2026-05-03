import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { PostResponse } from '@/types/api';

const createPostSchema = z.object({
  content: z.string().min(1, 'Gönderi boş olamaz').max(500, 'Maksimum 500 karakter'),
  imageUrl: z.string().optional(),
});

type CreatePostInput = z.infer<typeof createPostSchema>;

export function CreatePost() {
  const account = useAuthStore((state) => state.account);
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: { content: '' }
  });

  const mutation = useMutation({
    mutationFn: async (data: CreatePostInput) => {
      const res = await api.post<PostResponse>('/posts', data);
      return res.data;
    },
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['explore'] });
      toast.success('Gönderi paylaşıldı!');
    },
    onError: () => {
      toast.error('Gönderi paylaşılamadı. Lütfen tekrar dene.');
    }
  });

  return (
    <div className="flex gap-3 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800/50 bg-background">
      <Avatar className="h-10 w-10 shrink-0 mt-1">
        <AvatarImage src={account?.profileImageUrl || undefined} />
        <AvatarFallback>{account?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col w-full pt-0.5">
        <Textarea
          placeholder="Neler oluyor?"
          className="resize-none border-none shadow-none focus-visible:ring-0 px-3 py-2 text-[16px] min-h-[52px] bg-transparent text-foreground placeholder:text-muted-foreground/70 overflow-hidden"
          aria-invalid={!!errors.content}
          {...register('content')}
        />
        {errors.content && (
          <span className="text-xs font-medium text-destructive mt-1">{errors.content.message}</span>
        )}

        <div className="flex items-center justify-between pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800/50">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-primary hover:bg-primary/10 transition-colors -ml-2"
            onClick={() => toast.info("Fotoğraf yükleme özelliği backend'e eklendiğinde aktif olacak.")}
          >
            <ImageIcon className="h-5 w-5" />
          </Button>
          <Button
            type="submit"
            className="rounded-full font-bold px-5 h-9 transition-transform active:scale-95"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gönder'}
          </Button>
        </div>
      </form>
    </div>
  );
}
