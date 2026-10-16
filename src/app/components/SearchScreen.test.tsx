import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchScreen } from './SearchScreen';
import { FeedScreen } from './FeedScreen';
import { renderWithProviders } from '../../test/utils';
import { postView, signIn } from '../../test/api';
import { json } from '../../test/setup';

const type = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  await user.clear(screen.getByRole('textbox', { name: /buscar/i }));
  await user.type(screen.getByRole('textbox', { name: /buscar/i }), text);
};

/** API de búsqueda con resultados fijos; guarda cada consulta que llega. */
function searchApi({
  people = [] as { id: string; displayName: string; handle: string }[],
  posts = [] as Parameters<typeof postView>[0][],
} = {}) {
  const asked: string[] = [];
  signIn((url) => {
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    if (path === '/search/users') {
      asked.push(`users:${url.searchParams.get('q')}`);
      return json(200, {
        items: people.map((u) => ({
          avatarUrl: null,
          careerName: 'Medicina',
          verified: false,
          followStatus: 'NONE',
          canFollow: true,
          ...u,
        })),
        nextCursor: null,
      });
    }
    if (path === '/search/posts') {
      asked.push(`posts:${url.searchParams.get('q')}`);
      return json(200, { items: posts.map(postView), nextCursor: null });
    }
    return undefined;
  });
  return asked;
}

const MARIA = {
  id: '01926f00-0000-7000-8000-0000000000a2',
  displayName: 'María Rodríguez',
  handle: 'mrodriguez',
};

describe('DEF-07 · HU41 — Buscar usuarios', () => {
  it('HU41 E1: el nombre de un usuario existente muestra su perfil', async () => {
    const user = userEvent.setup();
    const asked = searchApi({ people: [MARIA] });
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await type(user, 'maria');

    expect(
      await screen.findByRole('link', { name: /María Rodríguez/ }),
    ).toHaveAttribute('href', `/u/${MARIA.id}`);
    expect(asked).toContain('users:maria');
  });

  it('HU41 E2: sin coincidencias, avisa que no hay resultados', async () => {
    const user = userEvent.setup();
    searchApi();
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await type(user, 'zzzz');

    expect(
      await screen.findByText(/no encontramos personas para “zzzz”/i),
    ).toBeInTheDocument();
  });

  it('con una sola letra pide escribir otra, sin preguntar a la API', async () => {
    const user = userEvent.setup();
    const asked = searchApi();
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await type(user, 'm');

    expect(
      screen.getByText('Escribe al menos 2 letras para buscar.'),
    ).toBeInTheDocument();
    expect(asked).toEqual([]);
  });
});

describe('DEF-07 · HU42 — Buscar contenido', () => {
  it('HU42 E1: una palabra clave muestra las publicaciones relacionadas', async () => {
    const user = userEvent.setup();
    searchApi({ posts: [{ id: 'p1', content: 'Repaso de cálculo hoy' }] });
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await type(user, 'calculo');
    await user.click(screen.getByRole('tab', { name: /publicaciones/i }));

    expect(
      await screen.findByText('Repaso de cálculo hoy'),
    ).toBeInTheDocument();
  });

  it('HU42 E2: sin coincidencias, avisa que no hay resultados', async () => {
    const user = userEvent.setup();
    searchApi();
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await type(user, 'zzzz');
    await user.click(screen.getByRole('tab', { name: /publicaciones/i }));

    expect(
      await screen.findByText(/no encontramos publicaciones para “zzzz”/i),
    ).toBeInTheDocument();
  });
});

describe('DEF-07 — Comportamiento de la pantalla de búsqueda', () => {
  it('cada pestaña lleva su conteo, para no perder resultados de la otra', async () => {
    const user = userEvent.setup();
    searchApi({
      people: [MARIA],
      posts: [{ id: 'p1', content: 'Grupo de anatomía' }],
    });
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await type(user, 'maria');

    expect(
      await screen.findByRole('tab', { name: /personas \(1\)/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('tab', { name: /publicaciones \(1\)/i }),
    ).toBeInTheDocument();
  });

  it('bug 1037: los accesos rápidos son las carreras reales y buscan con su nombre completo', async () => {
    const user = userEvent.setup();
    const asked = searchApi({ people: [MARIA] });
    renderWithProviders(<SearchScreen />, { route: '/search' });

    expect(screen.queryByText(/no encontramos/i)).not.toBeInTheDocument();
    await user.click(
      await screen.findByRole('button', { name: 'Ingeniería de Software' }),
    );

    expect(screen.getByRole('textbox', { name: /buscar/i })).toHaveValue(
      'Ingeniería de Software',
    );
    expect(await screen.findByText('María Rodríguez')).toBeInTheDocument();
    expect(asked).toContain('users:Ingeniería de Software');
    // Ya no hay accesos inventados como "Ing. Software" o "Anatomía".
    expect(
      screen.queryByRole('button', { name: 'Ing. Software' }),
    ).not.toBeInTheDocument();
  });

  it('el feed ofrece la entrada a la búsqueda global', () => {
    renderWithProviders(<FeedScreen />, { route: '/home' });

    expect(screen.getByRole('link', { name: /buscar/i })).toHaveAttribute(
      'href',
      '/search',
    );
  });
});

describe('DEF-07 · Búsqueda contra la API (live)', () => {
  it('HU41 E1: con sesión activa busca usuarios en la API /search/users', async () => {
    signIn((url) => {
      if (url.pathname.endsWith('/search/users')) {
        return json(200, {
          items: [
            {
              id: '01926f00-0000-7000-8000-000000000099',
              handle: 'josep',
              displayName: 'José Pérez',
              avatarUrl: null,
              careerName: 'Ingeniería de Software',
              verified: true,
              followStatus: 'NONE',
              canFollow: true,
            },
          ],
          nextCursor: null,
        });
      }
      return undefined;
    });

    const user = userEvent.setup();
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await type(user, 'jose');

    expect(await screen.findByText('José Pérez')).toBeInTheDocument();
  });

  it('HU42 E1: con sesión activa busca publicaciones en la API /search/posts', async () => {
    signIn((url) => {
      if (url.pathname.endsWith('/search/posts')) {
        return json(200, {
          items: [
            postView({
              id: 'p-search-1',
              content: 'Apuntes de cálculo integral',
            }),
          ],
          nextCursor: null,
        });
      }
      return undefined;
    });

    const user = userEvent.setup();
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await user.click(screen.getByRole('tab', { name: /publicaciones/i }));
    await type(user, 'calculo');

    expect(
      await screen.findByText('Apuntes de cálculo integral'),
    ).toBeInTheDocument();
  });

  it('HU40 E1: con sesión activa y sin texto muestra explorar desde /explore/posts', async () => {
    signIn((url) => {
      if (url.pathname.endsWith('/explore/posts')) {
        return json(200, {
          items: [
            postView({
              id: 'p-explore-1',
              content: 'Publicación popular destacada',
            }),
          ],
          nextCursor: null,
        });
      }
      return undefined;
    });

    renderWithProviders(<SearchScreen />, { route: '/search' });

    expect(
      await screen.findByText('Publicación popular destacada'),
    ).toBeInTheDocument();
  });

  it('bug 1015: Seguir desde los resultados sigue de verdad en la API y refresca el botón', async () => {
    const JOSE = '01926f00-0000-7000-8000-000000000099';
    let followStatus: 'NONE' | 'ACCEPTED' = 'NONE';
    const fetchMock = signIn((url) => {
      if (url.pathname.endsWith(`/users/${JOSE}/follow`)) {
        followStatus = 'ACCEPTED';
        return json(201, { id: 'f1', status: 'ACCEPTED' });
      }
      if (url.pathname.endsWith('/search/users')) {
        return json(200, {
          items: [
            {
              id: JOSE,
              handle: 'josep',
              displayName: 'José Pérez',
              avatarUrl: null,
              careerName: 'Ingeniería de Software',
              verified: false,
              followStatus,
              canFollow: true,
            },
          ],
          nextCursor: null,
        });
      }
      return undefined;
    });

    const user = userEvent.setup();
    renderWithProviders(<SearchScreen />, { route: '/search' });
    await type(user, 'jose');

    await user.click(
      await screen.findByRole('button', { name: 'Seguir a José' }),
    );

    expect(
      await screen.findByRole('button', { name: 'Dejar de seguir a José' }),
    ).toHaveTextContent('Siguiendo');
    const follow = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith(`/users/${JOSE}/follow`),
    );
    expect(follow?.[1]?.method).toBe('POST');
  });

  it('bug 1015: a un perfil privado no se le ofrece Seguir desde la búsqueda', async () => {
    signIn((url) =>
      url.pathname.endsWith('/search/users')
        ? json(200, {
            items: [
              {
                id: '01926f00-0000-7000-8000-000000000098',
                handle: 'priv',
                displayName: 'Paula Privada',
                avatarUrl: null,
                careerName: null,
                verified: false,
                followStatus: 'NONE',
                canFollow: false,
              },
            ],
            nextCursor: null,
          })
        : undefined,
    );

    const user = userEvent.setup();
    renderWithProviders(<SearchScreen />, { route: '/search' });
    await type(user, 'paula');

    expect(await screen.findByText('Paula Privada')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /seguir a paula/i }),
    ).not.toBeInTheDocument();
  });
});

describe('HU40 · Explorar sin contenido', () => {
  it('HU40 E2: sin contenido que recomendar muestra que no hay publicaciones para explorar', async () => {
    signIn((url) => {
      if (url.pathname.endsWith('/explore/posts')) {
        return json(200, { items: [], nextCursor: null });
      }
      return undefined;
    });

    renderWithProviders(<SearchScreen />, { route: '/search' });

    expect(
      await screen.findByText('No hay publicaciones recientes para explorar.'),
    ).toBeInTheDocument();
  });
});
