import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AdminMetricsResponse {
  users: { total: number; banned: number };
  posts: { total: number; flagged: number; removed: number };
  openReports: number;
  activeSessions: number;
  emails: { pending: number; sentToday: number; failed: number };
}

export function useAdminMetrics() {
  return useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: async () => {
      const { data } = await api.get<AdminMetricsResponse>('/admin/metrics');
      return data;
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}
