import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfileScreen } from './UserProfileScreen';
import { FollowListScreen } from './FollowListScreen';
import { NetworkScreen } from './NetworkScreen';
import { Toaster } from './ui/sonner';
import { renderRoutes } from '../../test/utils';
import { signIn, TEST_USER } from '../../test/api';
import { json } from '../../test/setup';
import type { ProfileView } from '../lib/profiles-api';
import type { FollowUser } from '../lib/follows-api';

// Seguir, dejar de seguir, listas y solicitudes (decisión 16, HU26, HU27 y HU32).
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
    bio: null,
    tags: [],
    counts: { posts: 0, followers: 0, following: 0 },
    ...overrides,
  };
}

const juan: FollowUser = {
  id: '01926f00-0000-7000-8000-0000000000cc',
  handle: 'jperez',
  displayName: 'Juan Pérez',
  avatarUrl: null,
  careerName: 'Medicina',
  verified: false,
};

const withToasts = (element: React.ReactElement) => (
  <>
    {element}
    <Toaster />
  </>
);

describe('HU26 y HU27 · Seguir desde el perfil', () => {
  it('HU26 E1 — seguir un perfil público lo sigue al instante', async () => {
    const user = userEvent.setup();
    let state: ProfileView['followStatus'] = 'NONE';
    const fetchMock = signIn((url) => {
      if (url.pathname.endsWith(`/users/${OTHER}/follow`)) {
        state = 'ACCEPTED';
        return json(201, { id: 'f1', status: 'ACCEPTED' });
      }
      if (url.pathname.endsWith(`/users/${OTHER}/profile`)) {
        return json(200, profileView({ followStatus: state }));
      }
      return undefined;
    });
    renderRoutes(
      [{ path: '/u/:userId', element: withToasts(<UserProfileScreen />) }],
      { route: `/u/${OTHER}` },
    );

    await user.click(
      await screen.findByRole('button', { name: /^seguir a maría$/i }),
    );

    expect(
      await screen.findByRole('button', { name: /dejar de seguir a maría/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Ahora sigues a María')).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith(`/users/${OTHER}/follow`),
    );
    expect(call?.[1]?.method).toBe('POST');
  });

  it('HU26 E2 — seguir un perfil "Solo seguidores" deja una solicitud pendiente', async () => {
    const user = userEvent.setup();
    let state: ProfileView['followStatus'] = 'NONE';
    signIn((url) => {
      if (url.pathname.endsWith(`/users/${OTHER}/follow`)) {
        state = 'PENDING';
        return json(201, { id: 'f1', status: 'PENDING' });
      }
      if (url.pathname.endsWith(`/users/${OTHER}/profile`)) {
        return json(
          200,
          profileView({
            visibility: 'FOLLOWERS',
            canSeeContent: false,
            followStatus: state,
          }),
        );
      }
      return undefined;
    });
    renderRoutes(
      [{ path: '/u/:userId', element: withToasts(<UserProfileScreen />) }],
      { route: `/u/${OTHER}` },
    );

    await user.click(
      await screen.findByRole('button', { name: /^seguir a maría$/i }),
    );

    expect(
      await screen.findByText('Le enviaste una solicitud a María'),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('button', {
        name: /cancelar la solicitud a maría/i,
      }),
    ).toBeInTheDocument();
    // Sigue limitado: una solicitud no es un seguimiento aceptado.
    expect(
      screen.getByText('Esta cuenta es solo para seguidores'),
    ).toBeInTheDocument();
  });

  it('HU27 E1 — dejar de seguir manda DELETE y vuelve a Seguir', async () => {
    const user = userEvent.setup();
    let state: ProfileView['followStatus'] = 'ACCEPTED';
    const fetchMock = signIn((url) => {
      if (url.pathname.endsWith(`/users/${OTHER}/follow`)) {
        state = 'NONE';
        return new Response(null, { status: 204 });
      }
      if (url.pathname.endsWith(`/users/${OTHER}/profile`)) {
        return json(200, profileView({ followStatus: state }));
      }
      return undefined;
    });
    renderRoutes(
      [{ path: '/u/:userId', element: withToasts(<UserProfileScreen />) }],
      { route: `/u/${OTHER}` },
    );

    await user.click(
      await screen.findByRole('button', { name: /dejar de seguir a maría/i }),
    );

    expect(
      await screen.findByRole('button', { name: /^seguir a maría$/i }),
    ).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(
      ([input, init]) =>
        String(input).endsWith(`/users/${OTHER}/follow`) &&
        init?.method === 'DELETE',
    );
    expect(call).toBeDefined();
  });
});

describe('HU32 · Listas de seguidores', () => {
  function renderList(followers: FollowUser[]) {
    signIn((url) => {
      if (url.pathname.endsWith(`/users/${OTHER}/profile`)) {
        return json(200, profileView());
      }
      if (url.pathname.endsWith(`/users/${OTHER}/followers`)) {
        return json(200, { items: followers, nextCursor: null });
      }
      return undefined;
    });
    renderRoutes(
      [
        {
          path: '/u/:userId/followers',
          element: <FollowListScreen kind="followers" />,
        },
      ],
      { route: `/u/${OTHER}/followers` },
    );
  }

  it('HU32 E1 — muestra quién sigue a la persona, con enlace a su perfil', async () => {
    renderList([juan]);

    const link = await screen.findByRole('link', { name: /juan pérez/i });
    expect(link).toHaveAttribute('href', `/u/${juan.id}`);
  });

  it('HU32 E2 — sin seguidores muestra el estado vacío', async () => {
    renderList([]);

    expect(
      await screen.findByText('María aún no tiene seguidores.'),
    ).toBeInTheDocument();
  });

  it('en un perfil limitado no pide la lista y muestra el aviso', async () => {
    const calls: string[] = [];
    signIn((url) => {
      if (url.pathname.endsWith('/followers')) calls.push(url.pathname);
      return url.pathname.endsWith(`/users/${OTHER}/profile`)
        ? json(
            200,
            profileView({ visibility: 'PRIVATE', canSeeContent: false }),
          )
        : undefined;
    });
    renderRoutes(
      [
        {
          path: '/u/:userId/followers',
          element: <FollowListScreen kind="followers" />,
        },
      ],
      { route: `/u/${OTHER}/followers` },
    );

    expect(
      await screen.findByText('Esta cuenta es privada'),
    ).toBeInTheDocument();
    expect(calls).toEqual([]);
  });
});

describe('Decisión 16 · Solicitudes en Mi red', () => {
  it('el dueño acepta una solicitud y desaparece de la lista', async () => {
    const user = userEvent.setup();
    let pending = true;
    const fetchMock = signIn((url) => {
      if (url.pathname.endsWith('/follows/req-1/accept')) {
        pending = false;
        return new Response(null, { status: 204 });
      }
      if (url.pathname.endsWith('/follows/requests')) {
        return json(200, {
          items: pending
            ? [
                {
                  id: 'req-1',
                  createdAt: '2026-10-06T10:00:00.000Z',
                  follower: juan,
                },
              ]
            : [],
          nextCursor: null,
        });
      }
      if (url.pathname.endsWith(`/users/${TEST_USER.id}/followers`)) {
        return json(200, { items: [], nextCursor: null });
      }
      return undefined;
    });
    renderRoutes(
      [{ path: '/network', element: withToasts(<NetworkScreen />) }],
      { route: '/network?tab=requests' },
    );

    await user.click(
      await screen.findByRole('button', {
        name: /aceptar la solicitud de juan/i,
      }),
    );

    expect(await screen.findByText('Juan ahora te sigue')).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByText('No tienes solicitudes pendientes.'),
      ).toBeInTheDocument(),
    );
    const call = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith('/follows/req-1/accept'),
    );
    expect(call?.[1]?.method).toBe('POST');
  });

  it('mis seguidores sin nadie muestran el estado vacío', async () => {
    signIn((url) =>
      url.pathname.endsWith(`/users/${TEST_USER.id}/followers`) ||
      url.pathname.endsWith('/follows/requests')
        ? json(200, { items: [], nextCursor: null })
        : undefined,
    );
    renderRoutes([{ path: '/network', element: <NetworkScreen /> }], {
      route: '/network',
    });

    expect(
      await screen.findByText('Aún no tienes seguidores.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'Seguidores', selected: true }),
    ).toBeInTheDocument();
  });
});
