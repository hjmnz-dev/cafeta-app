/**
 * Hooks de perfil y privacidad (decisión 15). La red queda en profiles-api.ts
 * y la caché en TanStack Query.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profilesApi } from '../lib/profiles-api';
import { followKeys, postKeys, profileKeys } from '../lib/query-keys';
import { useSession } from './SessionStore';

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

/**
 * Guardar el perfil propio: lo nuevo se ve de inmediato (se escribe en la
 * caché) y se refrescan las listas que muestran mi nombre y mi foto.
 */
export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient();
  const { refresh } = useSession();
  return useMutation({
    mutationFn: profilesApi.update,
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.view(userId), profile);
      // La sesión también guarda mi carrera y mi nombre.
      void refresh();
      void queryClient.invalidateQueries({ queryKey: postKeys.all });
      void queryClient.invalidateQueries({ queryKey: followKeys.all });
    },
  });
}
