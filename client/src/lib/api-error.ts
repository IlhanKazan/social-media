import type { TFunction } from 'i18next';
import type { AxiosError } from 'axios';
import type { ErrorResponse } from '@/types/api';

type ApiError = AxiosError<ErrorResponse>;

const KNOWN_ERROR_CODES = new Set([
  'INCORRECT_PASSWORD',
  'EMAIL_VERIFICATION_REQUIRED_FOR_MFA',
  'MFA_CODE_INVALID_OR_EXPIRED',
  'TOTP_SETUP_NOT_STARTED',
  'TOTP_CODE_INVALID',
  'EMAIL_LINK_ALREADY_USED',
  'EMAIL_LINK_EXPIRED',
  'EMAIL_LINK_INVALID',
  'CANNOT_REPORT_OWN_POST',
  'FILE_TOO_LARGE',
  'INVALID_FILE_FORMAT',
  'POSTING_RESTRICTED',
]);

export function getApiErrorMessage(t: TFunction, error: unknown, fallbackKey: string): string {
  const code = (error as ApiError | undefined)?.response?.data?.code;
  if (code && KNOWN_ERROR_CODES.has(code)) {
    return t(`errors.${code}`);
  }
  return t(fallbackKey);
}
