import { z } from 'zod';
import type { TFunction } from 'i18next';

export function createMfaSchema(t: TFunction) {
  return z.object({
    code: z.string().trim().min(1, t('auth.codeRequired')),
  });
}

export type MfaFormValues = z.infer<ReturnType<typeof createMfaSchema>>;
