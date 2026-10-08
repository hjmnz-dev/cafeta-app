/**
 * Hooks de comentarios en publicaciones (spec 0009, decisión 21). La red queda
 * en comments-api.ts y la caché en TanStack Query; se refresca al escribir, sin
 * evento por socket.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { postCommentsApi } from '../lib/comments-api';
import { commentKeys, postKeys } from '../lib/query-keys';

const firstPage = null as string | null;

/** enabled en false mientras el panel está cerrado: no se pide nada. */
export function usePostComments(postId: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: commentKeys.post(postId),
    queryFn: ({ pageParam }) => postCommentsApi.list(postId, pageParam),
    initialPageParam: firstPage,
    getNextPageParam: (page) => page.nextCursor,
    enabled,
  });
}

/** Crear o desactivar cambia el conteo de la tarjeta: se vuelve a pedir todo lo de ['posts']. */
export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postCommentsApi.create,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: commentKeys.all }),
        queryClient.invalidateQueries({ queryKey: postKeys.all }),
      ]),
  });
}

export function useEditComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postCommentsApi.edit,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: commentKeys.all }),
  });
}

export function useDeactivateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postCommentsApi.deactivate,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: commentKeys.all }),
        queryClient.invalidateQueries({ queryKey: postKeys.all }),
      ]),
  });
}
