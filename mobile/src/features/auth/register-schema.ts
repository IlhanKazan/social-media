import { z } from 'zod';

export const registerSchema = z
  .object({
    username: z.string().min(3, 'At least 3 characters').max(30, 'At most 30 characters'),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'At least 6 characters').max(100, 'At most 100 characters'),
    confirmPassword: z.string(),
    displayName: z.string().max(50, 'At most 50 characters').optional().or(z.literal('')),
    acceptedTerms: z.boolean().refine((v) => v, 'You must accept the Terms and Privacy Policy'),
    confirmedAge: z.boolean().refine((v) => v, 'You must confirm you meet the minimum age'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
