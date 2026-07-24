import { describe, it, expect } from 'vitest';
import i18n from '@/i18n';
import { createReportPostSchema } from './schemas';

const reportPostSchema = createReportPostSchema(i18n.t);

describe('reportPostSchema', () => {
  it('accepts a known report reason', () => {
    expect(reportPostSchema.safeParse({ reason: 'SPAM' }).success).toBe(true);
  });

  it('rejects an unknown reason', () => {
    expect(reportPostSchema.safeParse({ reason: 'NOPE' }).success).toBe(false);
  });

  it('rejects details longer than 500 characters', () => {
    expect(
      reportPostSchema.safeParse({ reason: 'OTHER', details: 'x'.repeat(501) }).success
    ).toBe(false);
  });
});
