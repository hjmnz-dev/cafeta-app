import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileScreen } from './ProfileScreen';
import { EditProfileScreen } from './EditProfileScreen';
import { CreateStoryScreen } from './CreateStoryScreen';
import { renderWithProviders, renderRoutes } from '../../test/utils';
import { page, postView, signIn, TEST_USER } from '../../test/api';
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
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <CreateStoryScreen />
        <ProfileScreen />
      </>,
      { route: '/create-story' },
    );

    // Sin historia propia, la foto lleva a crearla y no hay contador aparte.
    expect(
      screen.getByRole('link', { name: /crear historia/i }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('stat-stories')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /ver historia de/i }),
    ).not.toBeInTheDocument();

    await user.type(
      screen.getByRole('textbox', { name: /texto de la historia/i }),
      'Publicando una historia',
    );
    await user.click(screen.getByRole('button', { name: /^publicar$/i }));

    // Ahora la misma foto abre la historia, y el "+" sigue llevando a publicar.
    expect(
      screen.getByRole('link', { name: /ver historia de carlos gómez/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /crear historia/i }),
    ).toHaveAttribute('href', '/create-story');
    // Una sola foto: la tira de historias ya no se repite abajo.
    expect(screen.queryByText('Tu historia')).not.toBeInTheDocument();
  });

  it('sin biografía se explica el vacío en lugar de dejar el hueco', async () => {
    const user = userEvent.setup();
    renderRoutes(
      [
        { path: '/profile/edit', element: <EditProfileScreen /> },
        { path: '/profile', element: <ProfileScreen /> },
      ],
      { route: '/profile/edit' },
    );

    // El campo no está asociado a su etiqueta, se localiza por su contenido.
    await user.clear(screen.getByDisplayValue(/desarrollo web/i));
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(
      screen.getByText(/aún no has escrito una biografía/i),
    ).toBeInTheDocument();
  });

  it('Recursos muestra un vacío explicado, no fotos de relleno', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileScreen />, { route: '/profile' });

    await user.click(screen.getByRole('button', { name: /recursos/i }));
    expect(screen.getByText(/no has compartido recursos/i)).toBeInTheDocument();
  });

  it('decisión 19 — Guardados abre su propia pantalla en /profile/saved', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileScreen />, { route: '/profile' });

    await user.click(screen.getByRole('button', { name: /guardados/i }));

    expect(screen.getByTestId('location')).toHaveTextContent('/profile/saved');
  });
});
