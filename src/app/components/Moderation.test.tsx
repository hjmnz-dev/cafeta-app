import { describe, it, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfileScreen } from './UserProfileScreen';
import { PeopleScreen } from './PeopleScreen';
import { SettingsScreen } from './SettingsScreen';
import { renderRoutes } from '../../test/utils';
import { signIn } from '../../test/api';
import { json } from '../../test/setup';
import type { ProfileView } from '../lib/profiles-api';

// DEF-12 · HU53/HU54 contra la API simulada (decisión 29). La API decide qué
// deja de verse; aquí se prueba que la web lo pide y se actualiza sola.
const PEDRO = '01926f00-0000-7000-8000-0000000000e1';

const pedro = {
  id: PEDRO,
  handle: 'psanchez',
  displayName: 'Pedro Sánchez',
  avatarUrl: null,
  careerName: 'Medicina',
  verified: false,
};

function profileView(): ProfileView {
  return {
    ...pedro,
    careerId: null,
    location: null,
    visibility: 'PUBLIC',
    isSelf: false,
    canSeeContent: true,
    followStatus: 'NONE',
    canFollow: true,
    bio: 'Estudio el cuerpo humano',
    tags: [],
    counts: { posts: 0, followers: 3, following: 1 },
  };
}

/** API con el estado del bloqueo: bloqueado, Pedro no existe para mí. */
function blockingApi() {
  let blocked = false;
  const calls: string[] = [];
  const fetchMock = signIn((url, init) => {
    const method = init?.method ?? 'GET';
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    if (path === `/users/${PEDRO}/block`) {
      calls.push(`${method} ${path}`);
      blocked = method === 'POST';
      return method === 'POST'
        ? json(201, { blocked: true })
        : new Response(null, { status: 204 });
    }
    if (path === `/users/${PEDRO}/profile`) {
      return blocked
        ? json(404, { statusCode: 404, code: 'USER_NOT_FOUND' })
        : json(200, profileView());
    }
    if (path === '/discover/people') {
      return json(200, {
        items: blocked
          ? []
          : [{ ...pedro, followStatus: 'NONE', canFollow: true }],
        nextCursor: null,
      });
    }
    if (path === '/blocks') {
      return json(200, {
        items: blocked
          ? [{ ...pedro, blockedAt: new Date().toISOString() }]
          : [],
        nextCursor: null,
      });
    }
    return undefined;
  });
  return { calls, fetchMock };
}

const block = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(
    await screen.findByRole('button', { name: /más opciones|opciones/i }),
  );
  await user.click(screen.getByRole('menuitem', { name: /bloquear usuario/i }));
};

describe('DEF-12 · HU53/HU54 — Bloquear y desbloquear usuario', () => {
  it('HU53 E1: bloquear desde el perfil lo pide a la API y el perfil deja de verse', async () => {
    const user = userEvent.setup();
    const { calls } = blockingApi();
    renderRoutes([{ path: '/u/:userId', element: <UserProfileScreen /> }], {
      route: `/u/${PEDRO}`,
    });

    expect(
      await screen.findByRole('heading', { name: 'Pedro Sánchez' }),
    ).toBeInTheDocument();
    await block(user);

    expect(
      await screen.findByText('Usuario no encontrado'),
    ).toBeInTheDocument();
    expect(calls).toEqual([`POST /users/${PEDRO}/block`]);
  });

  it('HU53 E1: el bloqueado sale de Descubrir sin recargar', async () => {
    const user = userEvent.setup();
    blockingApi();
    renderRoutes(
      [
        {
          path: '/u/:userId',
          element: (
            <>
              <UserProfileScreen />
              <PeopleScreen />
            </>
          ),
        },
      ],
      { route: `/u/${PEDRO}` },
    );

    expect(
      await screen.findByRole('button', { name: 'Seguir a Pedro' }),
    ).toBeInTheDocument();
    await block(user);

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Seguir a Pedro' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('HU54 E1: la cuenta bloqueada se recupera desde Configuración', async () => {
    const user = userEvent.setup();
    const { calls } = blockingApi();
    renderRoutes(
      [
        {
          path: '/u/:userId',
          element: (
            <>
              <UserProfileScreen />
              <SettingsScreen />
            </>
          ),
        },
      ],
      { route: `/u/${PEDRO}` },
    );
    await block(user);

    const unblock = await screen.findByRole('button', {
      name: 'Desbloquear a Pedro Sánchez',
    });
    await user.click(unblock);

    await waitFor(() =>
      expect(calls).toEqual([
        `POST /users/${PEDRO}/block`,
        `DELETE /users/${PEDRO}/block`,
      ]),
    );
    // De vuelta: el perfil se ve otra vez.
    expect(
      await screen.findByRole('heading', { name: 'Pedro Sánchez' }),
    ).toBeInTheDocument();
    expect(
      within(document.body).queryByText('Usuario no encontrado'),
    ).not.toBeInTheDocument();
  });
});
