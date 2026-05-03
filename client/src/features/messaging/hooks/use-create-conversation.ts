import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import type { ConversationResponse } from '@/types/api';

export function useCreateConversation() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (accountId: number) => {
      const { data } = await api.post<ConversationResponse>(`/conversations/with/${accountId}`);
      return data;
    },
    onSuccess: (data) => {
      navigate(`/messages/${data.id}`);
    }
  });
}
