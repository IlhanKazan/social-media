import { z } from 'zod';
import type { TFunction } from 'i18next';

export function createLoginSchema(t: TFunction) {
  return z.object({
    identifier: z.string().trim().min(1, t('auth.login.identifierRequired')),
    password: z.string().min(1, t('auth.login.passwordRequired')),
  });
}
export type LoginInput = z.infer<ReturnType<typeof createLoginSchema>>;

export function createRegisterSchema(t: TFunction) {
  return z.object({
    username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, t('auth.register.usernameFormat')),
    email: z.string().trim().email(t('auth.register.emailInvalid')).max(254),
    displayName: z.string().trim().max(50).optional(),
    password: z.string().min(6, t('auth.register.passwordMin')).max(72),
    confirmPassword: z.string(),
    acceptedTerms: z.boolean().refine((v) => v === true, {
      message: t('auth.register.mustAcceptTerms'),
    }),
    confirmedAge: z.boolean().refine((v) => v === true, {
      message: t('auth.register.mustConfirmAge'),
    }),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('auth.register.passwordsMismatch'),
    path: ['confirmPassword'],
  });
}
export type RegisterInput = z.infer<ReturnType<typeof createRegisterSchema>>;

export function createForgotPasswordSchema(t: TFunction) {
  return z.object({
    email: z.string().trim().email(t('auth.forgotPassword.emailInvalid')),
  });
}
export type ForgotPasswordInput = z.infer<ReturnType<typeof createForgotPasswordSchema>>;

export function createResetPasswordSchema(t: TFunction) {
  return z.object({
    newPassword: z.string().min(8, t('auth.resetPassword.passwordMin')).max(72),
    confirmPassword: z.string(),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: t('auth.resetPassword.passwordsMismatch'),
    path: ['confirmPassword'],
  });
}
export type ResetPasswordInput = z.infer<ReturnType<typeof createResetPasswordSchema>>;
