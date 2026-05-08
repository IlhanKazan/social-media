import { z } from 'zod';

export const reportPostSchema = z.object({
  reason: z.enum(['HATE', 'HARASSMENT', 'SPAM', 'SELF_HARM', 'OTHER'], {
    message: 'Lütfen bir neden seçin',
  }),
  details: z.string().max(500, 'Detaylar en fazla 500 karakter olabilir').optional(),
});

export type ReportPostInput = z.infer<typeof reportPostSchema>;
