import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import type { ErrorResponse } from '@/types/api';

type ApiError = AxiosError<ErrorResponse>;

export function useChangePassword() {
  const logout = useAuthStore((state) => state.logout);
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: { oldPassword: string; newPassword: string }) => {
      await api.put('/accounts/me/password', data);
    },
    onSuccess: () => {
      toast.success(t('settings.changePassword.successToast'));
      logout();
    },
    onError: (error: ApiError) => {
      toast.error(getApiErrorMessage(t, error, 'settings.changePassword.updateError'));
    }
  });
}
