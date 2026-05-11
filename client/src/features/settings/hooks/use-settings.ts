import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';

export function useChangePassword() {
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: async (data: { oldPassword: string; newPassword: string }) => {
      await api.put('/accounts/me/password', data);
    },
    onSuccess: () => {
      toast.success('Şifreniz başarıyla değiştirildi! Güvenliğiniz için lütfen yeniden giriş yapın.');
      logout();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Şifre değiştirilirken bir hata oluştu.';
      toast.error(message);
    }
  });
}
