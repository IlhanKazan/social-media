import { z } from 'zod';

export const mfaSchema = z.object({
  code: z.string().min(1, 'Code is required'),
});

export type MfaFormValues = z.infer<typeof mfaSchema>;
