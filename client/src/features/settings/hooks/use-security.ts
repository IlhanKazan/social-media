import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

export function useLogoutAll() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout-all');
    },
    onSuccess: () => {
      useAuthStore.setState({ token: null, refreshToken: null, account: null });
      toast.success('Tüm cihazlardan çıkış yapıldı.');
      navigate('/login');
    },
    onError: () => {
      toast.error('İşlem sırasında bir hata oluştu.');
    }
  });
}

export function useDeleteAccount() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      await api.delete('/accounts/me');
    },
    onSuccess: () => {
      useAuthStore.setState({ token: null, refreshToken: null, account: null });
      toast.success('Hesabın başarıyla silindi. Seni özleyeceğiz!');
      navigate('/register');
    },
    onError: () => {
      toast.error('Hesap silinirken bir hata oluştu.');
    }
  });
}
