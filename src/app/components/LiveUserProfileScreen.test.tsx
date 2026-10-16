import { describe, it, expect } from 'vitest';
import { useLocation } from 'react-router';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfileScreen } from './UserProfileScreen';
import { renderRoutes } from '../../test/utils';
import { page, postView, signIn, TEST_USER } from '../../test/api';
import { json } from '../../test/setup';
import type { ProfileView } from '../lib/profiles-api';
import type { StoryTray } from '../lib/stories-api';

// Perfil ajeno desde la API (decisión 15, HU07 E2 y HU09) con fetch simulado.
const OTHER = '01926f00-0000-7000-8000-0000000000bb';

function profileView(overrides: Partial<ProfileView> = {}): ProfileView {
  return {
    id: OTHER,
    handle: 'mrodriguez',
    displayName: 'María Rodríguez',
    careerName: 'Medicina',
    careerId: null,
    avatarUrl: null,
    location: null,
    verified: false,
    visibility: 'PUBLIC',
    isSelf: false,
    canSeeContent: true,
    followStatus: 'NONE',
    canFollow: true,
    bio: 'Estudio el cuerpo humano',
    tags: [{ label: 'Anatomía', category: 'SKILL' }],
    counts: { posts: 1, followers: 12, following: 3 },
    ...overrides,
  };
}

/** Destino de "Enviar mensaje": muestra el query para comprobar a quién se escribe. */
function MessagesSearch() {
  return <p data-testid="messages-search">{useLocation().search}</p>;
}

function renderProfile(
  profile: ProfileView | Response,
  postsCalls: string[] = [],
  options: { tray?: StoryTray; authorVerified?: boolean } = {},
) {
  signIn((url) => {
    if (options.tray && url.pathname.endsWith('/stories')) {
      return json(200, options.tray);
    }
    if (url.pathname.endsWith(`/users/${OTHER}/profile`)) {
      return profile instanceof Response ? profile : json(200, profile);
    }
    if (url.pathname.endsWith(`/users/${OTHER}/posts`)) {
      postsCalls.push(url.pathname);
      return page([
        postView({
          id: '01926f00-0000-7000-8000-000000000100',
          content: 'Repaso de anatomía hoy',
          author: {
            id: OTHER,
            displayName: 'María Rodríguez',
            verified: options.authorVerified ?? false,
          },
        }),
      ]);
    }
    return undefined;
  });
  return renderRoutes(
    [
      { path: '/u/:userId', element: <UserProfileScreen /> },
      { path: '/profile', element: <p>Mi perfil</p> },
      { path: '/messages', element: <MessagesSearch /> },
      { path: '/stories/:storyId', element: <p>Visor de historias</p> },
    ],
    { route: `/u/${OTHER}` },
  );
}

describe('Decisión 15 · Perfil ajeno desde la API', () => {
  it('HU09 E1: un perfil público muestra su información, Seguir y sus publicaciones', async () => {
    renderProfile(profileView());

    expect(
      await screen.findByRole('heading', { name: 'María Rodríguez' }),
    ).toBeInTheDocument();
    expect(screen.getByText('@mrodriguez')).toBeInTheDocument();
    expect(screen.getByText('Estudio el cuerpo humano')).toBeInTheDocument();
    expect(screen.getByText('Anatomía')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('follower-count')).getByText('12'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^seguir a maría$/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Repaso de anatomía hoy'),
    ).toBeInTheDocument();
  });

  it('HU09 E2: con "Solo seguidores" muestra el perfil limitado y no pide sus publicaciones', async () => {
    const postsCalls: string[] = [];
    renderProfile(
      profileView({
        visibility: 'FOLLOWERS',
        canSeeContent: false,
        bio: null,
        tags: [],
      }),
      postsCalls,
    );

    expect(
      await screen.findByText('Esta cuenta es solo para seguidores'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Sigue a María para ver sus publicaciones e historias.'),
    ).toBeInTheDocument();
    // Lo que sí ve: nombre, carrera, conteos y Seguir.
    expect(screen.getByText('Medicina · INTEC')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('follower-count')).getByText('12'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^seguir a maría$/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Repaso de anatomía hoy')).toBeNull();
    expect(postsCalls).toEqual([]);
  });

  it('decisión 14 — muestra su foto y "Enviar mensaje" abre la conversación con ella', async () => {
    const user = userEvent.setup();
    renderProfile(
      profileView({
        avatarUrl: 'https://blob.test/maria.png',
        location: 'Santiago',
      }),
    );

    await screen.findByRole('heading', { name: 'María Rodríguez' });
    expect(
      document.querySelector('img[src="https://blob.test/maria.png"]'),
    ).not.toBeNull();

    expect(screen.getByText('Santiago')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /enviar mensaje/i }));
    expect(screen.getByTestId('messages-search')).toHaveTextContent(
      `?to=${OTHER}`,
    );
  });

  it('una solicitud pendiente se ve como Solicitado', async () => {
    renderProfile(
      profileView({
        visibility: 'FOLLOWERS',
        canSeeContent: false,
        followStatus: 'PENDING',
      }),
    );

    expect(
      await screen.findByRole('button', {
        name: /cancelar la solicitud a maría/i,
      }),
    ).toBeInTheDocument();
  });

  it('un perfil privado no muestra el botón Seguir', async () => {
    renderProfile(
      profileView({
        visibility: 'PRIVATE',
        canSeeContent: false,
        canFollow: false,
        bio: null,
        tags: [],
      }),
    );

    expect(
      await screen.findByText('Esta cuenta es privada'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /seguir/i })).toBeNull();
  });

  it('un perfil que no existe (o con bloqueo) dice Usuario no encontrado', async () => {
    renderProfile(json(404, { statusCode: 404, code: 'USER_NOT_FOUND' }));

    expect(
      await screen.findByText('Usuario no encontrado'),
    ).toBeInTheDocument();
  });

  it('mi propio id lleva a mi perfil', async () => {
    signIn();
    renderRoutes(
      [
        { path: '/u/:userId', element: <UserProfileScreen /> },
        { path: '/profile', element: <p>Mi perfil</p> },
        { path: '/messages', element: <p>Mensajes</p> },
      ],
      { route: `/u/${TEST_USER.id}` },
    );

    expect(await screen.findByText('Mi perfil')).toBeInTheDocument();
  });

  it('bug 1021 — una cuenta verificada muestra la insignia en el perfil y en sus publicaciones', async () => {
    renderProfile(profileView({ verified: true }), [], {
      authorVerified: true,
    });

    // Una en el encabezado del perfil y otra en su publicación.
    await screen.findByText('Repaso de anatomía hoy');
    expect(
      screen.getAllByRole('img', { name: 'Cuenta verificada' }),
    ).toHaveLength(2);
  });

  it('bug 1021 — sin verificar no hay insignia', async () => {
    renderProfile(profileView());

    await screen.findByText('Repaso de anatomía hoy');
    expect(
      screen.queryByRole('img', { name: 'Cuenta verificada' }),
    ).not.toBeInTheDocument();
  });

  it('bug 1017 — con una historia vigente, su foto abre la historia', async () => {
    const user = userEvent.setup();
    renderProfile(profileView(), [], {
      tray: {
        groups: [
          {
            author: {
              id: OTHER,
              handle: 'mrodriguez',
              displayName: 'María Rodríguez',
              avatarUrl: null,
            },
            stories: [
              {
                id: 's9',
                text: null,
                editedAt: null,
                myReaction: null,
                reactionCount: null,
                commentCount: 0,
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
                media: {
                  mediaType: 'IMAGE',
                  url: 'https://blob.test/s9.jpg',
                  mimeType: 'image/jpeg',
                },
              },
            ],
          },
        ],
      },
    });

    // La cabecera y cada publicación suya llevan el anillo (bug 1047).
    const rings = await screen.findAllByRole('link', {
      name: 'Ver historia de María Rodríguez',
    });
    expect(rings.length).toBeGreaterThanOrEqual(1);
    await user.click(rings[0]);
    expect(await screen.findByText('Visor de historias')).toBeInTheDocument();
  });

  it('bug 1017 — sin historias la foto no es un enlace', async () => {
    renderProfile(profileView(), [], { tray: { groups: [] } });

    await screen.findByRole('heading', { name: 'María Rodríguez' });
    expect(
      screen.queryByRole('link', { name: /ver historia/i }),
    ).not.toBeInTheDocument();
  });
});
