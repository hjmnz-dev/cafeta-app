/**
 * Hooks de historias (decisión 22). La red queda en stories-api.ts y la caché
 * en TanStack Query.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { storyKeys } from '../lib/query-keys';
import type { ReactionType } from '../lib/reactions';
import {
  mapStoryInTray,
  withStoryReaction,
  withStorySeen,
} from '../lib/stories';
import {
  storiesApi,
  type StoryReactionState,
  type StoryTray,
} from '../lib/stories-api';

/**
 * Bug 1068 · Marca la historia como vista. Se ve al instante en la bandeja
 * (anillo gris), sin volver a pedirla: el orden de la tira cambia al cerrar
 * el visor, no mientras se ve.
 */
export function useMarkStoryViewed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: storiesApi.markViewed,
    onMutate: (id: string) => {
      queryClient.setQueryData<StoryTray>(storyKeys.tray, (tray) =>
        mapStoryInTray(tray, id, withStorySeen),
      );
    },
  });
}

/** Quién reaccionó a mi historia (bug 1018); se pide al abrir el detalle. */
export function useStoryReactors(storyId: string) {
  return useInfiniteQuery({
    queryKey: storyKeys.reactors(storyId),
    queryFn: ({ pageParam }) => storiesApi.reactors(storyId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });
}

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

/** Editar el texto: la bandeja vuelve a pedirse y el visor muestra "Editada". */
export function useEditStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: storiesApi.edit,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: storyKeys.all }),
  });
}

/** Desactivar: la historia sale de la bandeja de inmediato. */
export function useDeactivateStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: storiesApi.deactivate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: storyKeys.all }),
  });
}

export interface ReactToStoryInput {
  id: string;
  /** La reacción que queda; null la quita. */
  type: ReactionType | null;
  /** La que tenía antes de tocar, para devolverla si la API falla. */
  previous: ReactionType | null;
}

/**
 * Mi reacción a una historia (spec 0009, decisión 24). Se ve al instante en la
 * bandeja; si la API falla se deshace. No invalida nada: el conteo es del autor
 * y la bandeja no se vuelve a pedir por reaccionar.
 */
export function useReactToStory() {
  const queryClient = useQueryClient();
  const change = (id: string, next: ReactionType | null) =>
    queryClient.setQueryData<StoryTray>(storyKeys.tray, (tray) =>
      mapStoryInTray(tray, id, (story) => withStoryReaction(story, next)),
    );
  return useMutation<StoryReactionState, Error, ReactToStoryInput>({
    mutationFn: ({ id, type }) =>
      type ? storiesApi.react(id, type) : storiesApi.unreact(id),
    onMutate: async ({ id, type }) => {
      await queryClient.cancelQueries({ queryKey: storyKeys.tray });
      change(id, type);
    },
    onError: (_error, { id, previous }) => change(id, previous),
  });
}
