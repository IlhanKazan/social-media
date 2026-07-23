import { z } from 'zod';
import type { TFunction } from 'i18next';

export function createForgotSchema(t: TFunction) {
  return z.object({
    email: z.string().trim().email(t('auth.forgotPassword.emailInvalid')),
  });
}

export type ForgotFormValues = z.infer<ReturnType<typeof createForgotSchema>>;
