import { z } from 'zod';

export const editProfileSchema = z.object({
  displayName: z.string().max(50, 'Maksimum 50 karakter').optional(),
  bio: z.string().max(160, 'Maksimum 160 karakter').optional(),
});

export type EditProfileInput = z.infer<typeof editProfileSchema>;
