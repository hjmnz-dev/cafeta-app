import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileScreen } from './ProfileScreen';
import { renderWithProviders, renderRoutes } from '../../test/utils';
import {
  myProfileView,
  page,
  postView,
  signIn,
  TEST_USER,
} from '../../test/api';
import { json } from '../../test/setup';

describe('DEF-08 — La información del perfil refleja el estado real', () => {
  it('decisión 16 — seguidores y seguidos vienen de la API y llevan a Mi red', async () => {
    const user = userEvent.setup();
    signIn((url) =>
      url.pathname.endsWith(`/users/${TEST_USER.id}/profile`)
        ? json(200, {
            id: TEST_USER.id,
            handle: 'cgomez_intec',
            displayName: 'Carlos Gómez',
            careerName: 'Ingeniería de Software',
            verified: false,
            visibility: 'PUBLIC',
            isSelf: true,
            canSeeContent: true,
            followStatus: 'NONE',
            canFollow: false,
            bio: null,
            tags: [],
            counts: { posts: 0, followers: 12, following: 3 },
          })
        : undefined,
    );
    renderRoutes(
      [
        { path: '/profile', element: <ProfileScreen /> },
        { path: '/network', element: <p>Mi red</p> },
      ],
      { route: '/profile' },
    );

    await waitFor(() =>
      expect(screen.getByTestId('stat-followers')).toHaveTextContent('12'),
    );
    expect(screen.getByTestId('stat-following')).toHaveTextContent('3');

    await user.click(screen.getByRole('button', { name: /seguidores/i }));
    expect(await screen.findByText('Mi red')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/network');
  });

  it('spec 0005 · AC-3: mis publicaciones y su conteo vienen de la API', async () => {
    const fetchMock = signIn((url) => {
      if (url.pathname.endsWith(`/users/${TEST_USER.id}/posts/count`)) {
        return json(200, { count: 7 });
      }
      if (url.pathname.endsWith(`/users/${TEST_USER.id}/posts`)) {
        return page([
          postView({
            id: 'mia',
            content: 'Mi primera publicación',
            author: { id: TEST_USER.id, displayName: 'Carlos Gómez' },
          }),
        ]);
      }
      return undefined;
    });
    renderWithProviders(<ProfileScreen />, { route: '/profile' });

    expect(await screen.findByTestId('post-mia')).toHaveTextContent(
      'Mi primera publicación',
    );
    expect(screen.getByTestId('stat-posts')).toHaveTextContent('7');
    // Solo pide las mías: el id sale de la sesión.
    const paths = fetchMock.mock.calls.map(
      ([input]) => new URL(String(input)).pathname,
    );
    expect(paths).toContain(`/api/v1/users/${TEST_USER.id}/posts`);
  });

  it('spec 0005: sin publicaciones propias explica el vacío', async () => {
    signIn();
    renderWithProviders(<ProfileScreen />, { route: '/profile' });

    expect(
      await screen.findByText(/aún no has publicado nada/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId('stat-posts')).toHaveTextContent('0');
  });

  it('la foto del perfil abre las historias propias y ofrece publicar otra', async () => {
    // La bandeja de la API decide si hay historia propia vigente.
    let groups: unknown[] = [];
    signIn((url, init) =>
      url.pathname.endsWith('/stories') && (init?.method ?? 'GET') === 'GET'
        ? json(200, { groups })
        : undefined,
    );
    const { unmount } = renderWithProviders(<ProfileScreen />, {
      route: '/profile',
    });

    // Sin historia propia, la foto lleva a crearla y no hay contador aparte.
    expect(
      await screen.findByRole('link', { name: /crear historia/i }),
    ).toHaveAttribute('href', '/create-story');
    expect(screen.queryByTestId('stat-stories')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /ver historia de/i }),
    ).not.toBeInTheDocument();
    unmount();

    // Con una historia vigente, la misma foto la abre y el "+" sigue llevando a publicar.
    groups = [
      {
        author: {
          id: TEST_USER.id,
          handle: TEST_USER.profile.handle,
          displayName: TEST_USER.profile.displayName,
          avatarUrl: null,
        },
        stories: [
          {
            id: 'm1',
            text: null,
            editedAt: null,
            createdAt: new Date(Date.now() - 60_000).toISOString(),
            expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
            media: {
              mediaType: 'IMAGE',
              url: 'https://blob.test/m1.jpg',
              mimeType: 'image/jpeg',
            },
          },
        ],
      },
    ];
    renderWithProviders(<ProfileScreen />, { route: '/profile' });

    expect(
      await screen.findByRole('link', {
        name: /ver historia de carlos gómez/i,
      }),
    ).toHaveAttribute('href', '/stories/m1');
    expect(
      screen.getByRole('link', { name: /crear historia/i }),
    ).toHaveAttribute('href', '/create-story');
    // Una sola foto: la tira de historias ya no se repite abajo.
    expect(screen.queryByText('Tu historia')).not.toBeInTheDocument();
  });

  it('sin biografía se explica el vacío en lugar de dejar el hueco', async () => {
    signIn((url) =>
      url.pathname.endsWith(`/users/${TEST_USER.id}/profile`)
        ? json(200, myProfileView({ bio: null, location: null, tags: [] }))
        : undefined,
    );
    renderWithProviders(<ProfileScreen />, { route: '/profile' });

    expect(
      await screen.findByText(/aún no has escrito una biografía/i),
    ).toBeInTheDocument();
  });

  it('bug 1029: Recursos pide a la API mis publicaciones con PDF y las muestra', async () => {
    const user = userEvent.setup();
    const asked: string[] = [];
    signIn((url) => {
      if (url.pathname.endsWith(`/users/${TEST_USER.id}/posts`)) {
        const resources = url.searchParams.get('resources') === 'true';
        asked.push(resources ? 'recursos' : 'todas');
        return page(
          resources
            ? [
                postView({
                  id: 'pdf1',
                  content: 'Pensum de Software',
                  author: { id: TEST_USER.id },
                  media: [
                    {
                      url: 'https://blob.test/pensum.pdf',
                      mediaType: 'DOCUMENT',
                      mimeType: 'application/pdf',
                    },
                  ],
                }),
              ]
            : [],
        );
      }
      return undefined;
    });
    renderWithProviders(<ProfileScreen />, { route: '/profile' });

    await user.click(await screen.findByRole('button', { name: /recursos/i }));

    expect(await screen.findByText('Pensum de Software')).toBeInTheDocument();
    expect(asked).toContain('recursos');
  });

  it('Recursos sin PDF publicados muestra un vacío explicado', async () => {
    const user = userEvent.setup();
    signIn();
    renderWithProviders(<ProfileScreen />, { route: '/profile' });

    await user.click(await screen.findByRole('button', { name: /recursos/i }));
    expect(
      await screen.findByText(/no has compartido recursos/i),
    ).toBeInTheDocument();
  });

  it('decisión 19 — Guardados abre su propia pantalla en /profile/saved', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileScreen />, { route: '/profile' });

    await user.click(screen.getByRole('button', { name: /guardados/i }));

    expect(screen.getByTestId('location')).toHaveTextContent('/profile/saved');
  });
});
