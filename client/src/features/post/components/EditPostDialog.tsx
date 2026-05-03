import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import { useEditPost } from '../hooks/use-edit-post';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { PostResponse } from '@/types/api';

const editPostSchema = z.object({
  content: z.string().min(1, 'Gönderi boş olamaz').max(500, 'Maksimum 500 karakter'),
  imageUrl: z.string().optional(),
});

type EditPostInput = z.infer<typeof editPostSchema>;

interface Props {
  post: PostResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPostDialog({ post, open, onOpenChange }: Props) {
  const editMutation = useEditPost(post.id);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditPostInput>({
    resolver: zodResolver(editPostSchema),
    defaultValues: {
      content: post.content,
      imageUrl: post.imageUrl || undefined,
    }
  });

  useEffect(() => {
    if (open) {
      reset({ content: post.content, imageUrl: post.imageUrl || undefined });
    }
  }, [open, post, reset]);

  const onSubmit = (data: EditPostInput) => {
    editMutation.mutate(data, {
      onSuccess: () => {
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Gönderiyi Düzenle</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Textarea
              {...register('content')}
              className="min-h-[100px] resize-none border-input focus-visible:ring-1"
              placeholder="Neler düşünüyorsun?"
              aria-invalid={!!errors.content}
            />
            {errors.content && (
              <p className="text-xs text-destructive">{errors.content.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <DialogClose render={<Button type="button" variant="ghost" />}>İptal</DialogClose>
            <Button type="submit" disabled={editMutation.isPending}>
              {editMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
