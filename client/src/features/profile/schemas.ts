import { z } from 'zod';
import type { TFunction } from 'i18next';

export function createEditProfileSchema(t: TFunction) {
  return z.object({
    displayName: z.string().max(50, t('profile.displayNameMax')).optional(),
    bio: z.string().max(160, t('profile.bioMax')).optional(),
  });
}

export type EditProfileInput = z.infer<ReturnType<typeof createEditProfileSchema>>;
