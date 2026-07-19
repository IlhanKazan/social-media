import { z } from 'zod';

export const mfaSchema = z.object({
  code: z.string().trim().min(1, 'Kod gerekli'),
});

export type MfaFormValues = z.infer<typeof mfaSchema>;
