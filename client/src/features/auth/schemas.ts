import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Username or Email is required'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Sadece harf, rakam ve alt çizgi'),
  email: z.string().email('Geçerli bir e-posta girin').max(254),
  displayName: z.string().max(50).optional(),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı').max(72),
  confirmPassword: z.string(),
  acceptedTerms: z.boolean().refine((v) => v === true, {
    message: 'Devam etmek için Şartlar ve Gizlilik Politikası\'nı kabul etmelisin',
  }),
  confirmedAge: z.boolean().refine((v) => v === true, {
    message: '13 yaş ve üzerinde olduğunu onaylamalısın',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Şifreler eşleşmiyor",
  path: ["confirmPassword"],
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi giriniz.'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Şifre en az 8 karakter olmalıdır.').max(72),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Şifreler eşleşmiyor.",
  path: ["confirmPassword"],
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
