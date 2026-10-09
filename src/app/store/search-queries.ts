/**
 * Hooks de datos de búsqueda y descubrimiento (spec 0008, decisión 28).
 */
import { useInfiniteQuery } from '@tanstack/react-query';
import { searchApi } from '../lib/search-api';
import { searchKeys } from '../lib/query-keys';

const firstPage = null as string | null;

/** Búsqueda de personas: se activa cuando la consulta tiene al menos 2 caracteres. */
export function useSearchUsers(query: string, enabled = true) {
  const trimmed = query.trim();
  const shouldFetch = enabled && trimmed.length >= 2;
  return useInfiniteQuery({
    queryKey: searchKeys.users(trimmed),
    queryFn: ({ pageParam }) => searchApi.users(trimmed, pageParam),
    initialPageParam: firstPage,
    getNextPageParam: (page) => page.nextCursor,
    enabled: shouldFetch,
  });
}

/** Búsqueda de publicaciones: se activa cuando la consulta tiene al menos 2 caracteres. */
export function useSearchPosts(query: string, enabled = true) {
  const trimmed = query.trim();
  const shouldFetch = enabled && trimmed.length >= 2;
  return useInfiniteQuery({
    queryKey: searchKeys.posts(trimmed),
    queryFn: ({ pageParam }) => searchApi.posts(trimmed, pageParam),
    initialPageParam: firstPage,
    getNextPageParam: (page) => page.nextCursor,
    enabled: shouldFetch,
  });
}

/** Explorar publicaciones recientes y populares de otros usuarios. */
export function useExplorePosts(enabled = true) {
  return useInfiniteQuery({
    queryKey: searchKeys.explore(),
    queryFn: ({ pageParam }) => searchApi.explore(pageParam),
    initialPageParam: firstPage,
    getNextPageParam: (page) => page.nextCursor,
    enabled,
  });
}
