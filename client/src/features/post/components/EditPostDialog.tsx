import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { useEditPost } from '../hooks/use-edit-post';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { PostResponse } from '@/types/api';

function createEditPostSchema(t: TFunction) {
  return z.object({
    content: z.string().min(1, t('compose.contentEmpty')).max(500, t('compose.contentMax')),
    imageUrl: z.string().optional(),
  });
}

type EditPostInput = z.infer<ReturnType<typeof createEditPostSchema>>;

interface Props {
  post: PostResponse;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPostDialog({ post, open, onOpenChange }: Props) {
  const { t, i18n } = useTranslation();
  const editMutation = useEditPost(post.id);
  const editPostSchema = useMemo(() => createEditPostSchema(t), [t, i18n.language]);

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
          <DialogTitle>{t('post.editDialog.title')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Textarea
              {...register('content')}
              className="min-h-[100px] resize-none border-input focus-visible:ring-1"
              placeholder={t('post.editDialog.placeholder')}
              aria-invalid={!!errors.content}
            />
            {errors.content && (
              <p className="text-xs text-destructive">{errors.content.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <DialogClose render={<Button type="button" variant="ghost" />}>{t('post.editDialog.cancel')}</DialogClose>
            <Button type="submit" disabled={editMutation.isPending}>
              {editMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('post.editDialog.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
