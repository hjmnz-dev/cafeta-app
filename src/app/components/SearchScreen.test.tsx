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

describe('DEF-07 · HU41 — Buscar usuarios', () => {
  it('Escenario 1 — el nombre de un usuario existente muestra su perfil', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await type(user, 'maria');

    expect(screen.getByText('María Rodríguez')).toBeInTheDocument();
    expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();
  });

  it('Escenario 1 — encuentra igual sin tildes y por carrera', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await type(user, 'perez');
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();

    await type(user, 'ing. software');
    expect(screen.getByText('Laura Batista')).toBeInTheDocument();
  });

  it('Escenario 2 — sin coincidencias, avisa que no hay resultados', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await type(user, 'zzzzz');

    expect(screen.getByText(/no encontramos personas/i)).toBeInTheDocument();
  });

  it('se puede seguir a alguien desde los resultados, sin salir de la búsqueda', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await type(user, 'maria');
    await user.click(screen.getByRole('button', { name: /seguir a maría/i }));

    expect(
      screen.getByRole('button', { name: /dejar de seguir a maría/i }),
    ).toBeInTheDocument();
  });
});

describe('DEF-07 · HU42 — Buscar contenido', () => {
  it('Escenario 1 — una palabra clave muestra las publicaciones relacionadas', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await user.click(screen.getByRole('tab', { name: /publicaciones/i }));
    await type(user, 'calculo');

    expect(screen.getByTestId('post-p2')).toBeInTheDocument();
    expect(screen.queryByTestId('post-p1')).not.toBeInTheDocument();
  });

  it('Escenario 2 — sin coincidencias, avisa que no hay resultados', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await user.click(screen.getByRole('tab', { name: /publicaciones/i }));
    await type(user, 'zzzzz');

    expect(
      screen.getByText(/no encontramos publicaciones/i),
    ).toBeInTheDocument();
  });
});

describe('DEF-07 — Comportamiento de la pantalla de búsqueda', () => {
  it('cada pestaña lleva su conteo, para no perder resultados de la otra', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await type(user, 'laura'); // usuaria Laura Batista + su publicación de grupo

    expect(
      screen.getByRole('tab', { name: /personas \(1\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /publicaciones \(1\)/i }),
    ).toBeInTheDocument();
  });

  it('sin consulta ofrece sugerencias del propio directorio en vez de un vacío', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchScreen />, { route: '/search' });

    expect(screen.queryByText(/no encontramos/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Medicina' }));

    expect(screen.getByText('María Rodríguez')).toBeInTheDocument();
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
  it('AC-1 (HU41): con sesión activa busca usuarios en la API /search/users', async () => {
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

  it('AC-6 (HU42): con sesión activa busca publicaciones en la API /search/posts', async () => {
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

  it('AC-9 (HU40): con sesión activa y sin texto muestra explorar desde /explore/posts', async () => {
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
