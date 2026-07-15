import { z } from 'zod';

export const forgotSchema = z.object({
  email: z.string().email('Enter a valid email'),
});

export type ForgotFormValues = z.infer<typeof forgotSchema>;
