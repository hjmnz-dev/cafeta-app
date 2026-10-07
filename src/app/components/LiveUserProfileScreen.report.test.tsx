import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfileScreen } from './UserProfileScreen';
import { Toaster } from './ui/sonner';
import { renderRoutes } from '../../test/utils';
import { page, signIn } from '../../test/api';
import { json } from '../../test/setup';
import type { ProfileView } from '../lib/profiles-api';

// Reportar a un usuario desde su perfil real (HU55, spec 0008 decisión 30).
const OTHER = '01926f00-0000-7000-8000-0000000000bb';

const profile: ProfileView = {
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
};

interface Call {
  method: string;
  body: unknown;
}

function renderProfile(
  response: () => Response = () => json(201, { id: 'r1' }),
) {
  const calls: Call[] = [];
  signIn((url, init) => {
    if (url.pathname.endsWith('/reports')) {
      calls.push({
        method: init?.method ?? 'GET',
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });
      return response();
    }
    if (url.pathname.endsWith(`/users/${OTHER}/profile`)) {
      return json(200, profile);
    }
    if (url.pathname.endsWith(`/users/${OTHER}/posts`)) return page([]);
    return undefined;
  });
  renderRoutes(
    [
      {
        path: '/u/:userId',
        element: (
          <>
            <UserProfileScreen />
            <Toaster />
          </>
        ),
      },
    ],
    { route: `/u/${OTHER}` },
  );
  return calls;
}

const openOptions = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(
    await screen.findByRole('button', { name: /opciones sobre maría/i }),
  );

const pickAndSend = async (user: ReturnType<typeof userEvent.setup>) => {
  await openOptions(user);
  await user.click(screen.getByRole('menuitem', { name: /reportar usuario/i }));
  await user.click(screen.getByLabelText(/acoso o intimidación/i));
  await user.click(screen.getByRole('button', { name: /enviar denuncia/i }));
};

describe('HU55 — Reportar a un usuario desde su perfil', () => {
  it('E1: envía POST /reports con el id del usuario y el motivo, y avisa', async () => {
    const user = userEvent.setup();
    const calls = renderProfile();

    await pickAndSend(user);

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({
      method: 'POST',
      body: { targetType: 'USER', targetId: OTHER, reason: 'HARASSMENT' },
    });
    expect(
      await screen.findByText(/un administrador revisará tu reporte/i),
    ).toBeInTheDocument();
  });

  it('tras reportar, la opción queda como "Usuario reportado" y apagada', async () => {
    const user = userEvent.setup();
    renderProfile();

    await pickAndSend(user);
    await screen.findByText(/un administrador revisará tu reporte/i);
    await openOptions(user);

    expect(
      screen.getByRole('menuitem', { name: /usuario reportado/i }),
    ).toBeDisabled();
  });

  it('E2: un duplicado dice que ya hay un reporte activo y apaga la opción', async () => {
    const user = userEvent.setup();
    renderProfile(() =>
      json(409, {
        statusCode: 409,
        code: 'REPORT_ALREADY_PENDING',
        message: 'x',
      }),
    );

    await pickAndSend(user);

    expect(
      await screen.findByText(/ya reportaste esto, un administrador/i),
    ).toBeInTheDocument();
    await openOptions(user);
    expect(
      screen.getByRole('menuitem', { name: /usuario reportado/i }),
    ).toBeDisabled();
  });

  it('un error de la API se muestra dentro del diálogo', async () => {
    const user = userEvent.setup();
    renderProfile(() =>
      json(404, { statusCode: 404, code: 'USER_NOT_FOUND', message: 'x' }),
    );

    await pickAndSend(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este perfil no existe o ya no está disponible.',
    );
  });
});
