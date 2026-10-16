/**
 * Hooks de bloqueos (decisión 29). La red queda en blocks-api.ts
 * y la caché en TanStack Query.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { blocksApi } from '../lib/blocks-api';
import {
  blockKeys,
  conversationKeys,
  postKeys,
  profileKeys,
  searchKeys,
} from '../lib/query-keys';

export function useBlockedUsers(cursor?: string) {
  return useQuery({
    queryKey: [...blockKeys.list, cursor],
    queryFn: () => blocksApi.blockedUsers(cursor),
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => blocksApi.block(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: blockKeys.all });
      void queryClient.invalidateQueries({ queryKey: profileKeys.all });
      void queryClient.invalidateQueries({ queryKey: postKeys.all });
      void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
      // El bloqueado deja de aparecer en la búsqueda y en Descubrir.
      void queryClient.invalidateQueries({ queryKey: searchKeys.all });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => blocksApi.unblock(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: blockKeys.all });
      void queryClient.invalidateQueries({ queryKey: profileKeys.all });
      void queryClient.invalidateQueries({ queryKey: postKeys.all });
      void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
      // El bloqueado deja de aparecer en la búsqueda y en Descubrir.
      void queryClient.invalidateQueries({ queryKey: searchKeys.all });
    },
  });
}
