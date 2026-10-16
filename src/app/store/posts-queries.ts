/**
 * Hooks de datos de publicaciones (spec 0005). Las pantallas solo leen estos
 * hooks; la red queda en posts-api.ts y la caché en TanStack Query.
 */
import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { careersApi } from '../lib/auth-api';
import { postsApi, type PostPage } from '../lib/posts-api';
import { uploadsApi } from '../lib/uploads-api';
import { careerKeys, isPostListKey, postKeys } from '../lib/query-keys';
import {
  mapPostInPages,
  withReaction,
  withServerState,
  type ReactionState,
  type ReactionType,
} from '../lib/reactions';
import { withSaved } from '../lib/saved';

const firstPage = null as string | null;

/** "Para ti" con careerId null; la pestaña de esa carrera con un id. */
export function useFeed(careerId: string | null, enabled = true) {
  return useInfiniteQuery({
    queryKey: postKeys.feed(careerId),
    queryFn: ({ pageParam }) => postsApi.feed(careerId, pageParam),
    initialPageParam: firstPage,
    getNextPageParam: (page) => page.nextCursor,
    enabled,
  });
}

/** enabled en false para un perfil limitado, que la API respondería con 403. */
export function useUserPosts(userId: string | undefined, enabled = true) {
  return useInfiniteQuery({
    queryKey: postKeys.byAuthor(userId ?? ''),
    queryFn: ({ pageParam }) => postsApi.byUser(userId ?? '', pageParam),
    initialPageParam: firstPage,
    getNextPageParam: (page) => page.nextCursor,
    enabled: enabled && Boolean(userId),
  });
}

/** Recursos del perfil (bug 1029): sus publicaciones con un PDF. */
export function useUserResources(userId: string | undefined, enabled = true) {
  return useInfiniteQuery({
    queryKey: postKeys.resources(userId ?? ''),
    queryFn: ({ pageParam }) =>
      postsApi.resourcesByUser(userId ?? '', pageParam),
    initialPageParam: firstPage,
    getNextPageParam: (page) => page.nextCursor,
    enabled: enabled && Boolean(userId),
  });
}

export function useUserPostCount(userId: string | undefined) {
  return useQuery({
    queryKey: postKeys.count(userId ?? ''),
    queryFn: () => postsApi.countByUser(userId ?? ''),
    enabled: Boolean(userId),
  });
}

export function useCareers() {
  return useQuery({ queryKey: careerKeys.all, queryFn: careersApi.list });
}

/** Al publicar, todo lo que cuelga de ['posts'] se vuelve a pedir. */
export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postKeys.all }),
  });
}

/**
 * Acciones del autor (spec 0008, decisión 17). Cada una invalida todo
 * ['posts'], así feed, perfil y conteo quedan al día.
 */
function usePostAction<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: postKeys.all }),
  });
}

export const useUpdatePost = () => usePostAction(postsApi.update);
export const useDeactivatePost = () => usePostAction(postsApi.deactivate);
export const useReactivatePost = () => usePostAction(postsApi.reactivate);
export const useDeletePost = () => usePostAction(postsApi.remove);
export const useArchivePost = () => usePostAction(postsApi.archive);
export const useRestorePost = () => usePostAction(postsApi.restore);

/** Mis publicaciones archivadas y desactivadas, con su `state` (funcionalidad 18). */
export function useArchivedPosts() {
  return useInfiniteQuery({
    queryKey: postKeys.archived,
    queryFn: ({ pageParam }) => postsApi.archived(pageParam),
    initialPageParam: firstPage,
    getNextPageParam: (page) => page.nextCursor,
  });
}

export interface ReactInput {
  id: string;
  /** La reacción que queda; null la quita. */
  type: ReactionType | null;
  /** La que tenía antes de tocar, para devolverla si la API falla. */
  previous: ReactionType | null;
}

/**
 * Mi reacción a una publicación (spec 0009, decisión 20). Se ve al instante en
 * todas las listas donde aparece; si la API falla se deshace, y si responde se
 * toma su conteo, que manda. No invalida nada: las listas no se vuelven a pedir.
 */
export function useReactToPost() {
  const queryClient = useQueryClient();
  const change = (id: string, edit: Parameters<typeof mapPostInPages>[2]) =>
    queryClient.setQueriesData<InfiniteData<PostPage>>(
      { predicate: (query) => isPostListKey(query.queryKey) },
      (data) => mapPostInPages(data, id, edit),
    );
  return useMutation<ReactionState, Error, ReactInput>({
    mutationFn: ({ id, type }) =>
      type ? postsApi.react(id, { type }) : postsApi.unreact(id),
    onMutate: async ({ id, type }) => {
      await queryClient.cancelQueries({
        predicate: (query) => isPostListKey(query.queryKey),
      });
      change(id, (view) => withReaction(view, type));
    },
    onError: (_error, { id, previous }) =>
      change(id, (view) => withReaction(view, previous)),
    onSuccess: (state, { id }) =>
      change(id, (view) => withServerState(view, state)),
  });
}

/** Mis guardadas (spec 0009, decisión 19), la más reciente primero. */
export function useSavedPosts() {
  return useInfiniteQuery({
    queryKey: postKeys.saved,
    queryFn: ({ pageParam }) => postsApi.saved(pageParam),
    initialPageParam: firstPage,
    getNextPageParam: (page) => page.nextCursor,
  });
}

export interface SaveInput {
  id: string;
  /** true guarda; false la quita de mi lista. */
  saved: boolean;
}

/**
 * Guardar o quitar una publicación (spec 0009, decisión 19). El marcador cambia
 * al instante en todas las listas donde aparece; si la API falla se deshace.
 * Al terminar solo se vuelve a pedir mi lista de guardadas: el resto de listas
 * ya quedó al día con el cambio local.
 */
export function useSavePost() {
  const queryClient = useQueryClient();
  const change = (id: string, saved: boolean) =>
    queryClient.setQueriesData<InfiniteData<PostPage>>(
      { predicate: (query) => isPostListKey(query.queryKey) },
      (data) => mapPostInPages(data, id, (view) => withSaved(view, saved)),
    );
  return useMutation<void, Error, SaveInput>({
    mutationFn: ({ id, saved }) =>
      saved ? postsApi.save(id) : postsApi.unsave(id),
    onMutate: async ({ id, saved }) => {
      await queryClient.cancelQueries({
        predicate: (query) => isPostListKey(query.queryKey),
      });
      change(id, saved);
    },
    onError: (_error, { id, saved }) => change(id, !saved),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: postKeys.saved }),
  });
}

/** Sube un archivo; no toca la caché (aún no es parte de ninguna publicación). */
export function useUploadFile() {
  return useMutation({ mutationFn: uploadsApi.upload });
}
