import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useReportPost } from '../hooks/use-report-post';
import { createReportPostSchema, type ReportPostInput } from '../schemas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Props {
  postId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportDialog({ postId, open, onOpenChange }: Props) {
  const { t, i18n } = useTranslation();
  const reportMutation = useReportPost(postId);
  const reportPostSchema = useMemo(() => createReportPostSchema(t), [t, i18n.language]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ReportPostInput>({
    resolver: zodResolver(reportPostSchema),
    defaultValues: { reason: 'OTHER', details: '' }
  });

  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = (data: ReportPostInput) => {
    reportMutation.mutate(data, {
      onSuccess: () => {
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('post.reportDialog.title')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-4">
          <div className="space-y-2">
            <Label htmlFor="reason">{t('post.reportDialog.reasonLabel')}</Label>
            <select
              id="reason"
              className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none dark:bg-input/30"
              {...register('reason')}
            >
              <option className="bg-background text-foreground" value="HATE">{t('post.reportDialog.reasonHate')}</option>
              <option className="bg-background text-foreground" value="HARASSMENT">{t('post.reportDialog.reasonHarassment')}</option>
              <option className="bg-background text-foreground" value="SPAM">{t('post.reportDialog.reasonSpam')}</option>
              <option className="bg-background text-foreground" value="SELF_HARM">{t('post.reportDialog.reasonSelfHarm')}</option>
              <option className="bg-background text-foreground" value="OTHER">{t('post.reportDialog.reasonOther')}</option>
            </select>
            {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">{t('post.reportDialog.detailsLabel')}</Label>
            <Textarea
              id="details"
              {...register('details')}
              className="min-h-[100px] resize-none"
              placeholder={t('post.reportDialog.detailsPlaceholder')}
              aria-invalid={!!errors.details}
            />
            {errors.details && <p className="text-xs text-destructive">{errors.details.message}</p>}
          </div>

          <DialogFooter className="pt-2">
            <DialogClose render={<Button type="button" variant="ghost" />}>{t('post.reportDialog.cancel')}</DialogClose>
            <Button type="submit" variant="destructive" disabled={reportMutation.isPending}>
              {reportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('post.reportDialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
