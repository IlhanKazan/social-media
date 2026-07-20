import { z } from 'zod';

export const registerSchema = z
  .object({
    username: z.string().trim().min(3, 'En az 3 karakter').max(30, 'En fazla 30 karakter'),
    email: z.string().trim().email('Geçerli bir e-posta girin'),
    password: z.string().min(6, 'En az 6 karakter').max(100, 'En fazla 100 karakter'),
    confirmPassword: z.string(),
    displayName: z.string().trim().max(50, 'En fazla 50 karakter').optional().or(z.literal('')),
    acceptedTerms: z.boolean().refine((v) => v, 'Şartları ve Gizlilik Politikası\'nı kabul etmelisin'),
    confirmedAge: z.boolean().refine((v) => v, 'Asgari yaş şartını sağladığını onaylamalısın'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
