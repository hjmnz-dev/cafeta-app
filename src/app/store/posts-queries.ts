/**
 * Hooks de datos de publicaciones (spec 0005). Las pantallas solo leen estos
 * hooks; la red queda en posts-api.ts y la caché en TanStack Query.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { careersApi } from '../lib/auth-api';
import { postsApi } from '../lib/posts-api';
import { careerKeys, postKeys } from '../lib/query-keys';

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
