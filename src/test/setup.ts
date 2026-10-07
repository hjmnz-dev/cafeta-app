import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

export const TEST_CAREERS = [
  {
    id: '01926f00-0000-7000-8000-0000000000c1',
    name: 'Ingeniería de Software',
  },
  { id: '01926f00-0000-7000-8000-0000000000c2', name: 'Medicina' },
];

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const EMPTY_PAGE = { items: [], nextCursor: null };

// La API no existe en las pruebas (spec 0004): fetch simulado por defecto.
// /auth/me responde 401 (sin sesión), /careers una lista fija y las listas de
// publicaciones y la bandeja de historias vacías (spec 0005); cada prueba puede sobreescribirlo con
// vi.mocked(fetch).
export const defaultFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const url = String(input);
  const path = new URL(url).pathname;
  // La tira de historias del feed pide la bandeja: vacía salvo que la prueba diga otra cosa.
  if (path.endsWith('/stories') && (init?.method ?? 'GET') === 'GET') {
    return Promise.resolve(json(200, { groups: [] }));
  }
  if (url.endsWith('/auth/me')) {
    return Promise.resolve(
      json(401, { statusCode: 401, code: 'UNAUTHORIZED' }),
    );
  }
  if (url.endsWith('/careers')) return Promise.resolve(json(200, TEST_CAREERS));
  if (path.endsWith('/posts/feed'))
    return Promise.resolve(json(200, EMPTY_PAGE));
  if (/\/users\/[^/]+\/posts\/count$/.test(path)) {
    return Promise.resolve(json(200, { count: 0 }));
  }
  if (/\/users\/[^/]+\/posts$/.test(path)) {
    return Promise.resolve(json(200, EMPTY_PAGE));
  }
  return Promise.resolve(json(404, { statusCode: 404, code: 'NOT_FOUND' }));
};

// jsdom no trae matchMedia; el Toaster de sonner lo usa para el tema.
const matchMedia = (query: string): MediaQueryList =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }) as MediaQueryList;

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(defaultFetch));
  vi.stubGlobal('matchMedia', matchMedia);
});

// Aísla cada prueba: desmonta el árbol y limpia el estado persistido
// (localStorage y sessionStorage) para que no se filtre entre tests.
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    /* jsdom sin storage: ignorar */
  }
});
