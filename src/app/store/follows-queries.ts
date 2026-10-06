/**
 * Hooks de seguimiento y red (decisión 16). La red queda en follows-api.ts y la
 * caché en TanStack Query.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { followsApi, type FollowListKind } from '../lib/follows-api';
import { followKeys, postKeys, profileKeys } from '../lib/query-keys';

const firstPage = null as string | null;

/** Seguir cambia conteos, listas, solicitudes y lo que llega al feed. */
function refreshNetwork(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: followKeys.all }),
    queryClient.invalidateQueries({ queryKey: profileKeys.all }),
    queryClient.invalidateQueries({ queryKey: postKeys.all }),
  ]);
}

/** enabled en false para un perfil limitado, que la API respondería con 403. */
export function useFollowList(
  userId: string,
  kind: FollowListKind,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey:
      kind === 'followers'
        ? followKeys.followers(userId)
        : followKeys.following(userId),
    queryFn: ({ pageParam }) => followsApi.list(userId, kind, pageParam),
    initialPageParam: firstPage,
    getNextPageParam: (page) => page.nextCursor,
    enabled: enabled && Boolean(userId),
  });
}

export function useFollowRequests() {
  return useInfiniteQuery({
    queryKey: followKeys.requests,
    queryFn: ({ pageParam }) => followsApi.requests(pageParam),
    initialPageParam: firstPage,
    getNextPageParam: (page) => page.nextCursor,
  });
}

/** Seguir (o pedir seguir) a un usuario. */
export function useFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: followsApi.follow,
    onSuccess: () => refreshNetwork(queryClient),
  });
}

/** Dejar de seguir o cancelar la solicitud. */
export function useUnfollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: followsApi.unfollow,
    onSuccess: () => refreshNetwork(queryClient),
  });
}

/** Aceptar o rechazar una solicitud recibida. */
export function useRespondRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      followId,
      accept,
    }: {
      followId: string;
      accept: boolean;
    }) => (accept ? followsApi.accept(followId) : followsApi.reject(followId)),
    onSuccess: () => refreshNetwork(queryClient),
  });
}
