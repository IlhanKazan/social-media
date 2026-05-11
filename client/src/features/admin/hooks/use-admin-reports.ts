import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export interface ReportGroup {
  postId: number;
  reportCount: number;
  latestReportedAt: string;
}

export function useAdminReports() {
  return useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: async () => {
      const { data } = await api.get<any>('/admin/reports');
      return data.content as ReportGroup[];
    },
  });
}

export function useResolveReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, resolution, removePost, banUser }: any) => {
      await api.post(`/admin/reports/${postId}/resolve`, { resolution, removePost, banUser });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      toast.success('Rapor çözümlendi.');
    }
  });
}
