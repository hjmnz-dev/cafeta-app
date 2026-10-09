/**
 * Hooks de historias (decisión 22). La red queda en stories-api.ts y la caché
 * en TanStack Query.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { storyKeys } from '../lib/query-keys';
import { storiesApi } from '../lib/stories-api';

export function useStoryTray(enabled = true) {
  return useQuery({
    queryKey: storyKeys.tray,
    queryFn: storiesApi.tray,
    enabled,
  });
}

/** Al publicar, la bandeja se vuelve a pedir y la historia sale en la tira. */
export function useCreateStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: storiesApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: storyKeys.all }),
  });
}
