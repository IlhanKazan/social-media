import { z } from 'zod';
import type { TFunction } from 'i18next';

export function createLoginSchema(t: TFunction) {
  return z.object({
    identifier: z.string().trim().min(1, t('auth.login.identifierRequired')),
    password: z.string().min(1, t('auth.login.passwordRequired')),
  });
}

export type LoginFormValues = z.infer<ReturnType<typeof createLoginSchema>>;
