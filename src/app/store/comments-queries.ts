/**
 * Hooks de comentarios en publicaciones (spec 0009, decisión 21) y en historias
 * (decisión 24). La red queda en comments-api.ts y la caché en TanStack Query;
 * se refresca al escribir, sin evento por socket.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { commentsApi, type CommentTarget } from '../lib/comments-api';
import { commentKeys, postKeys, storyKeys } from '../lib/query-keys';

const firstPage = null as string | null;

/** enabled en false mientras el panel está cerrado: no se pide nada. */
export function useComments(target: CommentTarget, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: commentKeys.of(target),
    queryFn: ({ pageParam }) => commentsApi.list(target, pageParam),
    initialPageParam: firstPage,
    getNextPageParam: (page) => page.nextCursor,
    enabled,
  });
}

/** La clave raíz de donde cuelga el conteo de comentarios del objetivo. */
const countRoot = (target: CommentTarget) =>
  target.kind === 'posts' ? postKeys.all : storyKeys.all;

/** Crear o desactivar cambia el conteo de la tarjeta o de la historia: se vuelve a pedir. */
export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: commentsApi.create,
    onSuccess: (_comment, { target }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: commentKeys.all }),
        queryClient.invalidateQueries({ queryKey: countRoot(target) }),
      ]),
  });
}

export function useEditComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: commentsApi.edit,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: commentKeys.all }),
  });
}

export function useDeactivateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: commentsApi.deactivate,
    onSuccess: (_result, { target }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: commentKeys.all }),
        queryClient.invalidateQueries({ queryKey: countRoot(target) }),
      ]),
  });
}
