import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './schemas';

describe('auth schemas', () => {
  it('login requires both identifier and password', () => {
    expect(loginSchema.safeParse({ identifier: '', password: '' }).success).toBe(false);
    expect(loginSchema.safeParse({ identifier: 'neo', password: 'pw' }).success).toBe(true);
  });

  it('register enforces username format/length and email', () => {
    const base = {
      username: 'neo_99',
      email: 'neo@example.com',
      password: 'secret1',
      confirmPassword: 'secret1',
    };
    expect(registerSchema.safeParse(base).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, username: 'ne' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, username: 'bad name!' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, email: 'not-an-email' }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: 'short' }).success).toBe(false);
  });

  it('register rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      username: 'neo',
      email: 'neo@example.com',
      password: 'secret1',
      confirmPassword: 'secret2',
    });
    expect(result.success).toBe(false);
  });

  it('forgot/reset password schemas validate their inputs', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.com' }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: 'x' }).success).toBe(false);
    expect(
      resetPasswordSchema.safeParse({ newPassword: 'longenough', confirmPassword: 'longenough' }).success
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({ newPassword: 'short', confirmPassword: 'short' }).success
    ).toBe(false);
  });
});
