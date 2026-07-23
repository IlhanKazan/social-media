import { z } from 'zod';
import type { TFunction } from 'i18next';

export function createRegisterSchema(t: TFunction) {
  return z
    .object({
      username: z.string().trim().min(3, t('auth.register.usernameMin')).max(30, t('auth.register.usernameMax')),
      email: z.string().trim().email(t('auth.register.emailInvalid')),
      password: z.string().min(6, t('auth.register.passwordMin')).max(100, t('auth.register.passwordMax')),
      confirmPassword: z.string(),
      displayName: z.string().trim().max(50, t('auth.register.displayNameMax')).optional().or(z.literal('')),
      acceptedTerms: z.boolean().refine((v) => v, t('auth.register.mustAcceptTerms')),
      confirmedAge: z.boolean().refine((v) => v, t('auth.register.mustConfirmAge')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('auth.register.passwordsMismatch'),
      path: ['confirmPassword'],
    });
}

export type RegisterFormValues = z.infer<ReturnType<typeof createRegisterSchema>>;
