import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Username or Email is required'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Only alphanumeric characters and underscores allowed'),
  email: z.string().email('Invalid email address').max(254),
  password: z.string().min(6, 'Password must be at least 6 characters').max(72),
  displayName: z.string().max(50).optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;
