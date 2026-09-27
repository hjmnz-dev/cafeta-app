import { vi } from 'vitest';
import { SESSION_KEY } from '../app/lib/http';
import type { PostView } from '../app/lib/posts-api';
import { defaultFetch, json, TEST_CAREERS } from './setup';

/** Estudiante con sesión en las pruebas; su carrera es la primera de TEST_CAREERS. */
export const TEST_USER = {
  id: '01926f00-0000-7000-8000-000000000001',
  email: 'cgomez@est.intec.edu.do',
  role: 'STUDENT',
  verificationStatus: 'PENDING',
  profile: {
    handle: 'cgomez_intec',
    displayName: 'Carlos Gómez',
    careerId: TEST_CAREERS[0].id,
  },
} as const;

/** Respuesta propia de una prueba; undefined deja la respuesta por defecto. */
export type Handler = (
  url: URL,
  init: RequestInit | undefined,
) => Response | undefined | Promise<Response | undefined>;

/**
 * Sesión guardada y confirmada por /auth/me. Las rutas que `handler` no
 * responde usan las respuestas por defecto de setup.ts.
 */
export function signIn(handler: Handler = () => undefined) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      accessToken: 'activo',
      expiresAt: '2099-01-01T00:00:00.000Z',
    }),
  );
  const fetchMock = vi.mocked(fetch);
  fetchMock.mockImplementation(async (input, init) => {
    const url = new URL(String(input));
    const custom = await handler(url, init);
    if (custom) return custom;
    if (url.pathname.endsWith('/auth/me')) return json(200, TEST_USER);
    return defaultFetch(input);
  });
  return fetchMock;
}

/** Publicación de la API con valores por defecto de un texto de otro autor. */
export function postView(
  overrides: Partial<Omit<PostView, 'author'>> & {
    id: string;
    author?: Partial<PostView['author']>;
  },
): PostView {
  const { author, ...rest } = overrides;
  return {
    type: 'TEXT',
    content: 'Hola INTEC',
    location: null,
    createdAt: new Date().toISOString(),
    editedAt: null,
    eventStartsAt: null,
    eventLocation: null,
    codeSnippet: null,
    groupName: null,
    groupSpots: null,
    reactionCount: 0,
    commentCount: 0,
    ...rest,
    author: {
      id: '01926f00-0000-7000-8000-0000000000aa',
      handle: 'jperez',
      displayName: 'Juan Pérez',
      careerName: 'Medicina',
      verified: false,
      ...author,
    },
  };
}

export const page = (items: PostView[], nextCursor: string | null = null) =>
  json(200, { items, nextCursor });
