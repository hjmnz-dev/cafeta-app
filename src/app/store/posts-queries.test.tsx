import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { postKeys } from '../lib/query-keys';
import { page, postView } from '../../test/api';
import { json } from '../../test/setup';
import {
  useCreatePost,
  useFeed,
  useUserPostCount,
  useUserPosts,
} from './posts-queries';

// Hooks de datos de publicaciones (spec 0005). fetch es el borde simulado.
function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const newClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

describe('useCreatePost', () => {
  it('AC-3: al publicar bien invalida todo lo que cuelga de postKeys.all', async () => {
    vi.mocked(fetch).mockResolvedValue(json(201, postView({ id: 'n' })));
    const client = newClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCreatePost(), {
      wrapper: wrapper(client),
    });

    await result.current.mutateAsync({ content: 'Hola' });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: postKeys.all });
  });

  it('AC-10: si falla no invalida nada', async () => {
    vi.mocked(fetch).mockResolvedValue(
      json(500, { statusCode: 500, code: 'INTERNAL_SERVER_ERROR' }),
    );
    const client = newClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCreatePost(), {
      wrapper: wrapper(client),
    });

    await expect(
      result.current.mutateAsync({ content: 'Hola' }),
    ).rejects.toThrow();
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('useFeed', () => {
  it('AC-5: usa nextCursor para la página siguiente y para cuando es null', async () => {
    vi.mocked(fetch).mockImplementation(async (input) =>
      new URL(String(input)).searchParams.get('cursor') === 'a'
        ? page([postView({ id: 'b' })])
        : page([postView({ id: 'a' })], 'a'),
    );
    const { result } = renderHook(() => useFeed(null), {
      wrapper: wrapper(newClient()),
    });

    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    await result.current.fetchNextPage();
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
    expect(
      result.current.data?.pages.flatMap((p) => p.items.map((i) => i.id)),
    ).toEqual(['a', 'b']);
  });

  it('AC-6: con enabled en false no pide nada', async () => {
    renderHook(() => useFeed('c1', false), { wrapper: wrapper(newClient()) });
    await new Promise((r) => setTimeout(r, 20));
    expect(
      vi
        .mocked(fetch)
        .mock.calls.filter(([i]) => String(i).includes('/posts/feed')),
    ).toHaveLength(0);
  });
});

describe('useUserPosts y useUserPostCount', () => {
  it('sin id de usuario (sesión aún cargando) no piden nada', async () => {
    const client = newClient();
    renderHook(
      () => {
        useUserPosts(undefined);
        useUserPostCount(undefined);
      },
      { wrapper: wrapper(client) },
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(
      vi
        .mocked(fetch)
        .mock.calls.filter(([i]) => String(i).includes('/users/')),
    ).toHaveLength(0);
  });
});
