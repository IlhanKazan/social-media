import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { toast } from 'sonner';
import type { ErrorResponse, TotpSetupResponse } from '@/types/api';

type ApiError = AxiosError<ErrorResponse>;

export function useStartEmailMfaSetup() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async () => {
      await api.post('/accounts/me/mfa/email/setup');
    },
    onSuccess: () => toast.success(t('settings.mfaEmail.codeSentToast')),
    onError: (e: ApiError) => toast.error(getApiErrorMessage(t, e, 'settings.mfaEmail.sendCodeError')),
  });
}

export function useEnableEmailMfa() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (code: string) => {
      await api.post('/accounts/me/mfa/email/enable', { code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success(t('settings.mfaEmail.enabledToast'));
    },
    onError: (e: ApiError) => toast.error(getApiErrorMessage(t, e, 'settings.mfaEmail.verifyError')),
  });
}

export function useDisableEmailMfa() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (password: string) => {
      await api.delete('/accounts/me/mfa/email', { data: { password } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success(t('settings.mfaEmail.disabledToast'));
    },
    onError: (e: ApiError) => toast.error(getApiErrorMessage(t, e, 'settings.mfaEmail.actionFailedError')),
  });
}

export function useStartTotpSetup() {
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async () => (await api.post<TotpSetupResponse>('/accounts/me/mfa/totp/setup')).data,
    onError: (e: ApiError) => toast.error(getApiErrorMessage(t, e, 'settings.totp.setupError')),
  });
}

export function useEnableTotp() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (code: string) =>
      (await api.post<string[]>('/accounts/me/mfa/totp/enable', { code })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success(t('settings.totp.enabledToast'));
    },
    onError: (e: ApiError) => toast.error(getApiErrorMessage(t, e, 'settings.totp.verifyError')),
  });
}

export function useDisableTotp() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  return useMutation({
    mutationFn: async (password: string) => {
      await api.delete('/accounts/me/mfa/totp', { data: { password } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success(t('settings.totp.disabledToast'));
    },
    onError: (e: ApiError) => toast.error(getApiErrorMessage(t, e, 'settings.totp.actionFailedError')),
  });
}
