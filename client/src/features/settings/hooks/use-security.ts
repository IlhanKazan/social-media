import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

export function useLogoutAll() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout-all');
    },
    onSuccess: () => {
      useAuthStore.setState({ token: null, account: null });
      toast.success(t('settings.dangerZone.signOutAllSuccess'));
      navigate('/login');
    },
    onError: () => {
      toast.error(t('settings.dangerZone.signOutAllError'));
    }
  });
}

export function useDeleteAccount() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async () => {
      await api.delete('/accounts/me');
    },
    onSuccess: () => {
      useAuthStore.setState({ token: null, account: null });
      toast.success(t('settings.dangerZone.deleteAccountSuccess'));
      navigate('/register');
    },
    onError: () => {
      toast.error(t('settings.dangerZone.deleteAccountError'));
    }
  });
}
