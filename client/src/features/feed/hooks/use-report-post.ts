import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { ReportPostInput } from '../schemas';

export function useReportPost(postId: number) {
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: ReportPostInput) => {
      await api.post(`/posts/${postId}/report`, data);
    },
    onSuccess: () => {
      toast.success(t('post.reportDialog.successTitle'), {
        description: t('post.reportDialog.successDesc'),
      });
    },
    onError: (error: any) => {
      if (error.response?.status === 429) {
        toast.error(t('post.reportDialog.rateLimitedTitle'), {
          description: t('post.reportDialog.rateLimitedDesc'),
        });
      } else {
        toast.error(t('post.reportDialog.errorTitle'), {
          description: t('post.reportDialog.errorDesc'),
        });
      }
    }
  });
}
