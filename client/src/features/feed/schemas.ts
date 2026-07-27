import { z } from 'zod';
import type { TFunction } from 'i18next';

export function createReportPostSchema(t: TFunction) {
  return z.object({
    reason: z.enum(['HATE', 'HARASSMENT', 'SPAM', 'SELF_HARM', 'OTHER'], {
      message: t('post.reportDialog.reasonRequired'),
    }),
    details: z.string().max(500, t('post.reportDialog.detailsMax')).optional(),
  });
}

export type ReportPostInput = z.infer<ReturnType<typeof createReportPostSchema>>;
