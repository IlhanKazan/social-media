import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { PageResponse } from '@/types/api';

export interface AdminUserDto {
  id: number;
  username: string;
  email: string;
  displayName: string;
  profileImageUrl?: string;
  role: string;
  emailVerified: boolean;
  joinedAt: string;
  lastLoginAt?: string;
  postCount: number;
  isBanned: boolean;
}

export function useAdminUsers(filters: { search: string; status: string }) {
  return useInfiniteQuery<PageResponse<AdminUserDto>>({
    queryKey: ['admin', 'users', filters],
    queryFn: async ({ pageParam = 0 }) => {
      const params = {
        page: pageParam,
        size: 20,
        search: filters.search.trim() || null,
        status: filters.status === 'all' ? null : filters.status,
      };
      const { data } = await api.get<PageResponse<AdminUserDto>>('/admin/users', { params });
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
  });
}

export function useAdminUserActions() {
  const queryClient = useQueryClient();

  const banUser = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => api.post(`/admin/users/${id}/ban`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Kullanıcı yasaklandı.');
    }
  });

  const unbanUser = useMutation({
    mutationFn: (id: number) => api.post(`/admin/users/${id}/unban`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Yasak kaldırıldı.');
    }
  });

  const forceLogout = useMutation({
    mutationFn: (id: number) => api.post(`/admin/users/${id}/force-logout`),
    onSuccess: () => toast.info('Oturumlar sonlandırıldı.')
  });

  const promoteUser = useMutation({
    mutationFn: (id: number) => api.post(`/admin/users/${id}/promote`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Kullanıcı ADMIN yapıldı.');
    }
  });

  const demoteUser = useMutation({
    mutationFn: (id: number) => api.post(`/admin/users/${id}/demote`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.warning('Admin yetkisi geri alındı.');
    }
  });

  const resetPassword = useMutation({
    mutationFn: (id: number) => api.post(`/admin/users/${id}/reset-password`),
    onSuccess: () => toast.success('Şifre sıfırlama e-postası gönderildi.')
  });

  return { banUser, unbanUser, forceLogout, promoteUser, demoteUser, resetPassword };
}
