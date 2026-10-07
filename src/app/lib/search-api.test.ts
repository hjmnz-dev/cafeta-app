import { describe, expect, it, vi } from 'vitest';
import { API_URL } from './http';
import { searchApi } from './search-api';
import { searchKeys } from './query-keys';

const lastCall = () => {
  const [input, init] = vi.mocked(fetch).mock.calls.at(-1) ?? [];
  return { url: String(input), init };
};

describe('searchApi', () => {
  it('AC-1 (HU41): buscar usuarios manda GET /search/users con la consulta', async () => {
    await searchApi.users('jose').catch(() => undefined);
    const { url } = lastCall();
    expect(url).toBe(`${API_URL}/search/users?q=jose`);
  });

  it('AC-5: la paginación de usuarios incluye cursor y limit cuando se pasan', async () => {
    await searchApi.users('jose', 'u10', 15).catch(() => undefined);
    const { url } = lastCall();
    expect(url).toBe(`${API_URL}/search/users?q=jose&cursor=u10&limit=15`);
  });

  it('AC-6 (HU42): buscar publicaciones manda GET /search/posts con el texto', async () => {
    await searchApi.posts('calculo').catch(() => undefined);
    const { url } = lastCall();
    expect(url).toBe(`${API_URL}/search/posts?q=calculo`);
  });

  it('AC-8: la paginación de publicaciones incluye cursor y limit', async () => {
    await searchApi.posts('calculo', 'p10', 20).catch(() => undefined);
    const { url } = lastCall();
    expect(url).toBe(`${API_URL}/search/posts?q=calculo&cursor=p10&limit=20`);
  });

  it('AC-9 (HU40): explorar manda GET /explore/posts', async () => {
    await searchApi.explore().catch(() => undefined);
    const { url } = lastCall();
    expect(url).toBe(`${API_URL}/explore/posts`);
  });

  it('AC-11: explorar incluye cursor y limit cuando se pasan', async () => {
    await searchApi.explore('p10', 10).catch(() => undefined);
    const { url } = lastCall();
    expect(url).toBe(`${API_URL}/explore/posts?cursor=p10&limit=10`);
  });
});

describe('searchKeys', () => {
  it('las claves cuelgan de searchKeys.all o searchKeys.explore', () => {
    expect(searchKeys.all).toEqual(['search']);
    expect(searchKeys.users('ana')).toEqual(['search', 'users', 'ana']);
    expect(searchKeys.posts('examen')).toEqual(['search', 'posts', 'examen']);
    expect(searchKeys.explore()).toEqual(['explore', 'posts']);
  });
});
