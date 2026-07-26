import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

export interface MobileVersionResponse {
  latestVersionCode: number;
  latestVersionName: string;
  minSupportedVersionCode: number;
  apkUrl: string;
  apkSha256: string;
  changelogUrl: string;
}

export function useMobileVersionCheck() {
  return useQuery({
    queryKey: ['mobile-version'],
    queryFn: async () => {
      const { data } = await api.get<MobileVersionResponse>('/mobile/version');
      return data;
    },
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}
