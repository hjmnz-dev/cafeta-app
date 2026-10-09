import { describe, expect, it, vi } from 'vitest';
import { API_URL } from './http';
import { postsApi, toQueryString } from './posts-api';
import { postKeys } from './query-keys';

// Llamadas de publicaciones (spec 0005). fetch es el borde que se simula
// (setup.ts responde listas vacías por defecto).
const lastCall = () => {
  const [input, init] = vi.mocked(fetch).mock.calls.at(-1) ?? [];
  return { url: String(input), init };
};

describe('toQueryString', () => {
  it('omite los valores null y undefined', () => {
    expect(toQueryString({ careerId: null, cursor: undefined })).toBe('');
  });

  it('arma la consulta con los valores presentes, codificados', () => {
    expect(toQueryString({ careerId: 'c 1', cursor: null })).toBe(
      '?careerId=c+1',
    );
    expect(toQueryString({ a: '1', b: '2' })).toBe('?a=1&b=2');
  });
});

describe('postsApi', () => {
  it('AC-1: publicar manda POST /posts con el contenido y la ubicación', async () => {
    await postsApi
      .create({ content: 'Hola', location: 'Biblioteca' })
      .catch(() => undefined);
    const { url, init } = lastCall();
    expect(url).toBe(`${API_URL}/posts`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({
      content: 'Hola',
      location: 'Biblioteca',
    });
  });

  it('AC-4: "Para ti" es /posts/feed sin parámetros', async () => {
    await postsApi.feed(null, null);
    expect(lastCall().url).toBe(`${API_URL}/posts/feed`);
  });

  it('AC-5 y AC-6: la pestaña y el cursor viajan como careerId y cursor', async () => {
    await postsApi.feed('c1', 'p20');
    expect(lastCall().url).toBe(`${API_URL}/posts/feed?careerId=c1&cursor=p20`);
  });

  it('AC-3: mis publicaciones y su conteo cuelgan de /users/:id/posts', async () => {
    await postsApi.byUser('u1', 'p20');
    expect(lastCall().url).toBe(`${API_URL}/users/u1/posts?cursor=p20`);
    await postsApi.countByUser('u1');
    expect(lastCall().url).toBe(`${API_URL}/users/u1/posts/count`);
  });

  it('funcionalidad 18: archivadas, archivar y restaurar cuelgan de /posts', async () => {
    await postsApi.archived(null).catch(() => undefined);
    expect(lastCall().url).toBe(`${API_URL}/posts/archived`);
    await postsApi.archived('p20').catch(() => undefined);
    expect(lastCall().url).toBe(`${API_URL}/posts/archived?cursor=p20`);

    await postsApi.archive('p1').catch(() => undefined);
    expect(lastCall().url).toBe(`${API_URL}/posts/p1/archive`);
    expect(lastCall().init?.method).toBe('POST');

    await postsApi.restore('p1').catch(() => undefined);
    expect(lastCall().url).toBe(`${API_URL}/posts/p1/restore`);
    expect(lastCall().init?.method).toBe('POST');
  });
});

describe('postKeys', () => {
  it('AC-3: todas las claves de publicaciones cuelgan de postKeys.all', () => {
    const keys = [
      postKeys.feed(null),
      postKeys.feed('c1'),
      postKeys.byAuthor('u1'),
      postKeys.count('u1'),
      postKeys.archived,
    ];
    for (const key of keys) {
      expect(key.slice(0, postKeys.all.length)).toEqual([...postKeys.all]);
    }
  });

  it('cada pestaña de carrera tiene su propia caché', () => {
    expect(postKeys.feed('c1')).not.toEqual(postKeys.feed('c2'));
    expect(postKeys.feed(null)).not.toEqual(postKeys.feed('c1'));
  });
});
