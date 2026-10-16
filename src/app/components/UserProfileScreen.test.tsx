import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfileScreen } from './UserProfileScreen';
import { PeopleScreen } from './PeopleScreen';
import { renderRoutes, renderWithProviders } from '../../test/utils';
import { signIn, TEST_USER } from '../../test/api';
import { json } from '../../test/setup';
import type { ProfileView } from '../lib/profiles-api';

// DEF-05 · HU26/HU27 y Descubrir contra la API simulada (decisión 16 y bugs
// 1031 y 1033). La API decide si seguir es inmediato o una solicitud.
const MARIA = '01926f00-0000-7000-8000-0000000000a2';

const maria = {
  id: MARIA,
  handle: 'mrodriguez',
  displayName: 'María Rodríguez',
  avatarUrl: null,
  careerName: 'Medicina',
  verified: false,
};

type Follow = ProfileView['followStatus'];

/** El perfil de María con el seguimiento y la privacidad del momento. */
function followApi(visibility: ProfileView['visibility'] = 'PUBLIC') {
  let status: Follow = 'NONE';
  const calls: string[] = [];
  signIn((url, init) => {
    const method = init?.method ?? 'GET';
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    if (path === `/users/${MARIA}/follow`) {
      calls.push(method);
      status =
        method === 'DELETE'
          ? 'NONE'
          : visibility === 'PUBLIC'
            ? 'ACCEPTED'
            : 'PENDING';
      return method === 'DELETE'
        ? new Response(null, { status: 204 })
        : json(201, { id: 'f1', status });
    }
    if (path === `/users/${MARIA}/profile`) {
      const sees = visibility === 'PUBLIC' || status === 'ACCEPTED';
      return json(200, {
        ...maria,
        careerId: null,
        location: null,
        visibility,
        isSelf: false,
        canSeeContent: sees,
        followStatus: status,
        canFollow: visibility !== 'PRIVATE',
        bio: sees ? 'Apuntes de anatomía' : null,
        tags: [],
        counts: {
          posts: 0,
          followers: 12 + (status === 'ACCEPTED' ? 1 : 0),
          following: 3,
        },
      } satisfies ProfileView);
    }
    return undefined;
  });
  return calls;
}

const profile = () =>
  renderRoutes([{ path: '/u/:userId', element: <UserProfileScreen /> }], {
    route: `/u/${MARIA}`,
  });

describe('DEF-05 · HU26/HU27 — Seguir / dejar de seguir', () => {
  it('HU26 E1: seguir a un perfil público lo pide a la API y suma un seguidor', async () => {
    const user = userEvent.setup();
    const calls = followApi();
    profile();

    await user.click(
      await screen.findByRole('button', { name: 'Seguir a María' }),
    );

    expect(
      await screen.findByRole('button', { name: 'Dejar de seguir a María' }),
    ).toHaveTextContent('Siguiendo');
    await waitFor(() =>
      expect(screen.getByTestId('follower-count')).toHaveTextContent('13'),
    );
    expect(calls).toEqual(['POST']);
  });

  it('HU27 E1: dejar de seguir lo pide a la API y descuenta el seguidor', async () => {
    const user = userEvent.setup();
    const calls = followApi();
    profile();

    await user.click(
      await screen.findByRole('button', { name: 'Seguir a María' }),
    );
    await user.click(
      await screen.findByRole('button', { name: 'Dejar de seguir a María' }),
    );

    expect(
      await screen.findByRole('button', { name: 'Seguir a María' }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('follower-count')).toHaveTextContent('12'),
    );
    expect(calls).toEqual(['POST', 'DELETE']);
  });

  it('HU26 E2: con "Solo seguidores" queda como solicitud y no revela el contenido', async () => {
    const user = userEvent.setup();
    followApi('FOLLOWERS');
    profile();

    await user.click(
      await screen.findByRole('button', { name: 'Seguir a María' }),
    );

    expect(
      await screen.findByRole('button', {
        name: 'Cancelar la solicitud a María',
      }),
    ).toHaveTextContent('Solicitado');
    expect(screen.queryByText('Apuntes de anatomía')).not.toBeInTheDocument();
  });

  it('un enlace que no es de la API (como los de la demo vieja) dice que no existe', () => {
    signIn();
    renderRoutes([{ path: '/u/:userId', element: <UserProfileScreen /> }], {
      route: '/u/laura',
    });

    expect(screen.getByText('Usuario no encontrado')).toBeInTheDocument();
  });
});

describe('Descubrir (bugs 1031 y 1033) — personas reales de la API', () => {
  /** Sugerencias y búsqueda de la API; `me` es el usuario de la sesión. */
  function discoverApi({
    suggestions = [maria],
    results = [] as (typeof maria)[],
  } = {}) {
    const asked: string[] = [];
    signIn((url) => {
      const path = url.pathname.replace(/^.*\/api\/v1/, '');
      const row = (u: typeof maria) => ({
        ...u,
        followStatus: 'NONE',
        canFollow: true,
      });
      if (path === '/discover/people') {
        asked.push('discover');
        return json(200, { items: suggestions.map(row), nextCursor: null });
      }
      if (path === '/search/users') {
        asked.push(`search:${url.searchParams.get('q')}`);
        return json(200, { items: results.map(row), nextCursor: null });
      }
      if (path === `/users/${TEST_USER.id}/profile`) {
        return json(200, {
          id: TEST_USER.id,
          handle: TEST_USER.profile.handle,
          displayName: TEST_USER.profile.displayName,
          avatarUrl: null,
          careerId: null,
          careerName: null,
          location: null,
          verified: false,
          visibility: 'PUBLIC',
          isSelf: true,
          canSeeContent: true,
          followStatus: 'NONE',
          canFollow: false,
          bio: null,
          tags: [],
          counts: { posts: 0, followers: 4, following: 2 },
        } satisfies ProfileView);
      }
      return undefined;
    });
    return asked;
  }

  it('sin escribir, sugiere personas reales con su botón Seguir y dice a cuántas sigues', async () => {
    const asked = discoverApi();
    renderWithProviders(<PeopleScreen />, { route: '/discover' });

    expect(await screen.findByText('Sugerencias para ti')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /María Rodríguez/ }),
    ).toHaveAttribute('href', `/u/${MARIA}`);
    expect(
      screen.getByRole('button', { name: 'Seguir a María' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Sigues a 2 personas')).toBeInTheDocument();
    expect(asked).toEqual(['discover']);
  });

  it('al escribir busca en la API, y sin coincidencias lo explica', async () => {
    const user = userEvent.setup();
    const asked = discoverApi({ results: [] });
    renderWithProviders(<PeopleScreen />, { route: '/discover' });

    await user.type(
      screen.getByRole('textbox', { name: /buscar personas/i }),
      'zz',
    );

    expect(
      await screen.findByText('No encontramos personas para “zz”.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Prueba con otro nombre, el usuario (@) o la carrera.'),
    ).toBeInTheDocument();
    expect(asked).toContain('search:zz');
  });

  it('bug 1031: buscarse a sí mismo dice que la propia cuenta no aparece', async () => {
    const user = userEvent.setup();
    discoverApi({ results: [] });
    renderWithProviders(<PeopleScreen />, { route: '/discover' });

    await user.type(
      screen.getByRole('textbox', { name: /buscar personas/i }),
      'Carlos',
    );

    expect(
      await screen.findByText('Tu propia cuenta no aparece en la búsqueda.'),
    ).toBeInTheDocument();
  });

  it('con una sola letra pide escribir otra, y sin sugerencias lo dice', async () => {
    const user = userEvent.setup();
    discoverApi({ suggestions: [] });
    renderWithProviders(<PeopleScreen />, { route: '/discover' });

    expect(
      await screen.findByText('Por ahora no hay más personas para sugerirte.'),
    ).toBeInTheDocument();
    await user.type(
      screen.getByRole('textbox', { name: /buscar personas/i }),
      'm',
    );
    expect(
      screen.getByText('Escribe al menos 2 letras para buscar.'),
    ).toBeInTheDocument();
  });
});
