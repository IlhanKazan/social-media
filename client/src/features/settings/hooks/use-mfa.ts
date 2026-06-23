import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { ErrorResponse, TotpSetupResponse } from '@/types/api';

type ApiError = AxiosError<ErrorResponse>;

export function useStartEmailMfaSetup() {
  return useMutation({
    mutationFn: async () => {
      await api.post('/accounts/me/mfa/email/setup');
    },
    onSuccess: () => toast.success('Doğrulama kodu e-postana gönderildi.'),
    onError: (e: ApiError) => toast.error(e.response?.data?.message || 'Kod gönderilemedi.'),
  });
}

export function useEnableEmailMfa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      await api.post('/accounts/me/mfa/email/enable', { code });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('İki adımlı doğrulama açıldı.');
    },
    onError: (e: ApiError) => toast.error(e.response?.data?.message || 'Kod doğrulanamadı.'),
  });
}

export function useDisableEmailMfa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (password: string) => {
      await api.delete('/accounts/me/mfa/email', { data: { password } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('İki adımlı doğrulama kapatıldı.');
    },
    onError: (e: ApiError) => toast.error(e.response?.data?.message || 'İşlem başarısız.'),
  });
}

export function useStartTotpSetup() {
  return useMutation({
    mutationFn: async () => (await api.post<TotpSetupResponse>('/accounts/me/mfa/totp/setup')).data,
    onError: (e: ApiError) => toast.error(e.response?.data?.message || 'Kurulum başlatılamadı.'),
  });
}

export function useEnableTotp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) =>
      (await api.post<string[]>('/accounts/me/mfa/totp/enable', { code })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Authenticator ile 2FA açıldı.');
    },
    onError: (e: ApiError) => toast.error(e.response?.data?.message || 'Kod doğrulanamadı.'),
  });
}

export function useDisableTotp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (password: string) => {
      await api.delete('/accounts/me/mfa/totp', { data: { password } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('Authenticator 2FA kapatıldı.');
    },
    onError: (e: ApiError) => toast.error(e.response?.data?.message || 'İşlem başarısız.'),
  });
}
