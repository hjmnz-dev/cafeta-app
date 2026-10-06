import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { UserProfileScreen } from './UserProfileScreen';
import { renderRoutes } from '../../test/utils';
import { page, postView, signIn, TEST_USER } from '../../test/api';
import { json } from '../../test/setup';
import type { ProfileView } from '../lib/profiles-api';

// Perfil ajeno desde la API (decisión 15, HU07 E2 y HU09) con fetch simulado.
const OTHER = '01926f00-0000-7000-8000-0000000000bb';

function profileView(overrides: Partial<ProfileView> = {}): ProfileView {
  return {
    id: OTHER,
    handle: 'mrodriguez',
    displayName: 'María Rodríguez',
    careerName: 'Medicina',
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

function renderProfile(
  profile: ProfileView | Response,
  postsCalls: string[] = [],
) {
  signIn((url) => {
    if (url.pathname.endsWith(`/users/${OTHER}/profile`)) {
      return profile instanceof Response ? profile : json(200, profile);
    }
    if (url.pathname.endsWith(`/users/${OTHER}/posts`)) {
      postsCalls.push(url.pathname);
      return page([
        postView({
          id: '01926f00-0000-7000-8000-000000000100',
          content: 'Repaso de anatomía hoy',
          author: { id: OTHER, displayName: 'María Rodríguez' },
        }),
      ]);
    }
    return undefined;
  });
  return renderRoutes(
    [
      { path: '/u/:userId', element: <UserProfileScreen /> },
      { path: '/profile', element: <p>Mi perfil</p> },
    ],
    { route: `/u/${OTHER}` },
  );
}

describe('Decisión 15 · Perfil ajeno desde la API', () => {
  it('HU09 E1 — un perfil público muestra su información, Seguir y sus publicaciones', async () => {
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
      screen.getByRole('button', { name: /^seguir$/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('Repaso de anatomía hoy'),
    ).toBeInTheDocument();
  });

  it('HU07 E2 y HU09 E2 — con "Solo seguidores" muestra el perfil limitado y no pide sus publicaciones', async () => {
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
      screen.getByRole('button', { name: /^seguir$/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Repaso de anatomía hoy')).toBeNull();
    expect(postsCalls).toEqual([]);
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
      await screen.findByRole('button', { name: /solicitado/i }),
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
      ],
      { route: `/u/${TEST_USER.id}` },
    );

    expect(await screen.findByText('Mi perfil')).toBeInTheDocument();
  });
});
