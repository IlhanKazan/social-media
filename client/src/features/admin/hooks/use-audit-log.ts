import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PageResponse } from '@/types/api';

export interface AuditLogDto {
  id: number;
  action: string;
  actorId?: number;
  actorUsername?: string;
  targetType: string;
  targetId?: number;
  metadata: Record<string, any>;
  createdAt: string;
}

export function useAuditLog(filters: any) {
  return useInfiniteQuery<PageResponse<AuditLogDto>>({
    queryKey: ['admin', 'audit-log', filters],
    queryFn: async ({ pageParam = 0 }) => {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '' && v !== null)
      );

      const { data } = await api.get<PageResponse<AuditLogDto>>('/admin/audit-log', {
        params: { page: pageParam, size: 30, ...cleanFilters },
      });
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.page + 1),
  });
}
