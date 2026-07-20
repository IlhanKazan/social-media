import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Kullanıcı adı veya e-posta gerekli'),
  password: z.string().min(1, 'Şifre gerekli'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
