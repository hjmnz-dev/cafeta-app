/**
 * Hooks de perfil y privacidad (decisión 15). La red queda en profiles-api.ts
 * y la caché en TanStack Query.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profilesApi } from '../lib/profiles-api';
import { postKeys, profileKeys } from '../lib/query-keys';

export function useProfile(userId: string, enabled = true) {
  return useQuery({
    queryKey: profileKeys.view(userId),
    queryFn: () => profilesApi.view(userId),
    enabled: enabled && Boolean(userId),
  });
}

export function usePrivacy() {
  return useQuery({
    queryKey: profileKeys.privacy,
    queryFn: profilesApi.privacy,
  });
}

/** Cambiar la privacidad cambia qué ven los demás: se refrescan perfiles y publicaciones. */
export function useUpdatePrivacy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profilesApi.updatePrivacy,
    onSuccess: (privacy) => {
      queryClient.setQueryData(profileKeys.privacy, privacy);
      void queryClient.invalidateQueries({ queryKey: profileKeys.all });
      void queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}
