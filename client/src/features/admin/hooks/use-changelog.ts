import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import type { PageResponse } from '@/types/api';

export interface ChangelogAdminEntry {
  readonly id: number;
  readonly version: string;
  readonly titleTr: string;
  readonly titleEn: string;
  readonly bodyTr: string;
  readonly bodyEn: string;
  readonly publishedAt: string | null;
  readonly createdAt: string;
}

export interface ChangelogInput {
  readonly version: string;
  readonly titleTr: string;
  readonly titleEn: string;
  readonly bodyTr: string;
  readonly bodyEn: string;
  readonly published: boolean;
}

export function useChangelogEntries() {
  return useQuery({
    queryKey: ['admin', 'changelog'],
    queryFn: async () => {
      const { data } = await api.get<PageResponse<ChangelogAdminEntry>>('/admin/changelog', {
        params: { size: 50 },
      });
      return data;
    },
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'changelog'] });
    // The public page caches per language, so both copies have to go.
    void queryClient.invalidateQueries({ queryKey: ['changelog'] });
  };
}

export function useSaveChangelogEntry() {
  const { t } = useTranslation();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async ({ id, input }: { id?: number; input: ChangelogInput }) => {
      if (id) {
        const { data } = await api.put<ChangelogAdminEntry>(`/admin/changelog/${id}`, input);
        return data;
      }
      const { data } = await api.post<ChangelogAdminEntry>('/admin/changelog', input);
      return data;
    },
    onSuccess: () => {
      toast.success(t('admin.changelog.saved'));
      invalidate();
    },
    onError: (error) => toast.error(getApiErrorMessage(t, error, 'admin.changelog.saveError')),
  });
}

export function useDeleteChangelogEntry() {
  const { t } = useTranslation();
  const invalidate = useInvalidate();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/changelog/${id}`);
    },
    onSuccess: () => {
      toast.success(t('admin.changelog.deleted'));
      invalidate();
    },
    onError: (error) => toast.error(getApiErrorMessage(t, error, 'admin.changelog.deleteError')),
  });
}
