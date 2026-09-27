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

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// La API no existe en las pruebas (spec 0004): fetch simulado por defecto.
// /auth/me responde 401 (sin sesión) y /careers una lista fija; cada prueba
// puede sobreescribirlo con vi.mocked(fetch).
export const defaultFetch = (input: RequestInfo | URL): Promise<Response> => {
  const url = String(input);
  if (url.endsWith('/auth/me')) {
    return Promise.resolve(
      json(401, { statusCode: 401, code: 'UNAUTHORIZED' }),
    );
  }
  if (url.endsWith('/careers')) return Promise.resolve(json(200, TEST_CAREERS));
  return Promise.resolve(json(404, { statusCode: 404, code: 'NOT_FOUND' }));
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(defaultFetch));
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
