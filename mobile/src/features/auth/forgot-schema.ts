import { z } from 'zod';

export const forgotSchema = z.object({
  email: z.string().trim().email('Geçerli bir e-posta girin'),
});

export type ForgotFormValues = z.infer<typeof forgotSchema>;
