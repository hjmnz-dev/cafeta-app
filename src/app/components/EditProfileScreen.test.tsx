import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditProfileScreen } from './EditProfileScreen';
import { ProfileScreen } from './ProfileScreen';
import { renderRoutes } from '../../test/utils';
import { myProfileView, signIn, TEST_USER } from '../../test/api';
import { json, TEST_CAREERS } from '../../test/setup';
import type { ProfileView } from '../lib/profiles-api';
import { useSession } from '../store/SessionStore';

// Decisión 14, HU10: editar el perfil propio contra la API.
const PROFILE_PATH = `/users/${TEST_USER.id}/profile`;

/** API de perfil con estado: el PATCH cambia lo que devuelven los GET siguientes. */
function profileApi(initial: Partial<ProfileView> = {}) {
  let current = myProfileView(initial);
  const patches: Record<string, unknown>[] = [];
  const fetchMock = signIn(async (url, init) => {
    if (url.pathname.endsWith('/me/profile') && init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      patches.push(body);
      const careerId =
        (body.careerId as string | undefined) ?? current.careerId;
      current = {
        ...current,
        ...(typeof body.displayName === 'string'
          ? { displayName: body.displayName }
          : {}),
        ...('bio' in body ? { bio: body.bio as string | null } : {}),
        ...('location' in body
          ? { location: body.location as string | null }
          : {}),
        ...(body.tags ? { tags: body.tags as ProfileView['tags'] } : {}),
        careerId,
        careerName:
          TEST_CAREERS.find((c) => c.id === careerId)?.name ??
          current.careerName,
      };
      return json(200, current);
    }
    if (url.pathname.endsWith(PROFILE_PATH)) return json(200, current);
    return undefined;
  });
  return { fetchMock, patches };
}

function renderEdit() {
  return renderRoutes(
    [
      { path: '/profile/edit', element: <EditProfileScreen /> },
      { path: '/profile', element: <ProfileScreen /> },
    ],
    { route: '/profile/edit' },
  );
}

describe('Decisión 14 · HU10 — Editar perfil', () => {
  it('carga los valores actuales del perfil desde la API', async () => {
    profileApi();
    renderEdit();

    expect(await screen.findByDisplayValue('Carlos Gómez')).toBeInTheDocument();
    expect(screen.getByDisplayValue('@cgomez_intec')).toBeDisabled();
    expect(screen.getByDisplayValue('Santo Domingo')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(/desarrollo web y diseño/i),
    ).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  it('HU10 E2: no permite guardar con el nombre vacío y no llama a la API', async () => {
    const user = userEvent.setup();
    const { patches } = profileApi();
    renderEdit();

    await user.clear(await screen.findByLabelText('Nombre'));
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(screen.getByText(/el nombre es requerido/i)).toBeInTheDocument();
    expect(patches).toHaveLength(0);
    expect(screen.getByTestId('location')).toHaveTextContent('/profile/edit');
  });

  it('HU10 E1: guarda los cambios y se reflejan de inmediato en el perfil', async () => {
    const user = userEvent.setup();
    const { patches } = profileApi();
    renderEdit();

    const nameInput = await screen.findByLabelText('Nombre');
    await user.clear(nameInput);
    await user.type(nameInput, 'Carlos M. Gómez');
    const bio = screen.getByLabelText('Biografía');
    await user.clear(bio);
    await user.type(bio, 'Bio actualizada');
    await user.selectOptions(screen.getByLabelText('Carrera'), 'Medicina');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(
      await screen.findByRole('heading', { name: 'Carlos M. Gómez' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/profile');
    expect(screen.getByText('Bio actualizada')).toBeInTheDocument();
    expect(screen.getByText(/medicina · intec/i)).toBeInTheDocument();
    expect(patches[0]).toMatchObject({
      displayName: 'Carlos M. Gómez',
      bio: 'Bio actualizada',
      careerId: TEST_CAREERS[1].id,
    });
    // La foto no cambió: no viaja avatarKey.
    expect(patches[0]).not.toHaveProperty('avatarKey');
  });

  it('agrega una etiqueta, rechaza una repetida y la manda a la API', async () => {
    const user = userEvent.setup();
    const { patches } = profileApi();
    renderEdit();

    const input = await screen.findByPlaceholderText(/agregar etiqueta/i);
    await user.type(input, 'GraphQL');
    await user.click(screen.getByRole('button', { name: /agregar etiqueta/i }));
    expect(screen.getByText('GraphQL')).toBeInTheDocument();

    // Repetida (sin importar mayúsculas): no se suma otra vez.
    await user.type(input, 'graphql');
    await user.click(screen.getByRole('button', { name: /agregar etiqueta/i }));
    expect(screen.getAllByText(/graphql/i)).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /guardar/i }));
    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]?.tags).toEqual([
      { label: 'React', category: 'SKILL' },
      { label: 'GraphQL', category: 'SKILL' },
    ]);
  });

  it('quitar la ubicación y la biografía las manda como null', async () => {
    const user = userEvent.setup();
    const { patches } = profileApi();
    renderEdit();

    await user.clear(await screen.findByLabelText('Ubicación'));
    await user.clear(screen.getByLabelText('Biografía'));
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]).toMatchObject({ location: null, bio: null });
  });

  it('sube la foto, la muestra y manda su clave al guardar', async () => {
    const user = userEvent.setup();
    const { fetchMock, patches } = profileApi();
    const base = fetchMock.getMockImplementation();
    fetchMock.mockImplementation(async (input, init) => {
      if (new URL(String(input)).pathname.endsWith('/uploads')) {
        return json(201, {
          mediaType: 'IMAGE',
          key: 'image/0192f0c4-7d1a-7c3e-9a51-3c2b8e1f4a10.png',
          url: 'https://blob.test/foto.png',
          mimeType: 'image/png',
          sizeBytes: 4,
        });
      }
      return base ? base(input, init) : json(404, {});
    });
    renderEdit();

    await screen.findByLabelText('Nombre');
    await user.upload(
      screen.getByTestId('avatar-input'),
      new File(['x'], 'yo.png', { type: 'image/png' }),
    );
    await waitFor(() =>
      expect(
        document.querySelector('img[src="https://blob.test/foto.png"]'),
      ).not.toBeNull(),
    );
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => expect(patches).toHaveLength(1));
    expect(patches[0]?.avatarKey).toBe(
      'image/0192f0c4-7d1a-7c3e-9a51-3c2b8e1f4a10.png',
    );
  });

  it('rechaza como foto un archivo que no es imagen sin subirlo', async () => {
    const { fetchMock } = profileApi();
    renderEdit();

    await screen.findByLabelText('Nombre');
    // applyAccept: false, porque el selector real ya filtra por tipo.
    const input = screen.getByTestId('avatar-input');
    await userEvent
      .setup({ applyAccept: false })
      .upload(input, new File(['x'], 'tesis.pdf', { type: 'application/pdf' }));

    const uploads = fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith('/uploads'),
    );
    expect(uploads).toHaveLength(0);
  });

  it('muestra "Reintentar" si el perfil no carga', async () => {
    signIn((url) =>
      url.pathname.endsWith(PROFILE_PATH)
        ? json(500, { statusCode: 500, message: 'x', code: 'INTERNAL_ERROR' })
        : undefined,
    );
    renderEdit();

    expect(
      await screen.findByRole('button', { name: /reintentar/i }),
    ).toBeInTheDocument();
  });
});

describe('Cambiar de carrera actualiza la sesión sin recargar', () => {
  function SessionCareer() {
    const { user } = useSession();
    return <p data-testid="session-career">{user?.profile.careerId}</p>;
  }

  it('al guardar otra carrera se vuelve a pedir /auth/me y la sesión la usa', async () => {
    const user = userEvent.setup();
    let current = myProfileView();
    let meCalls = 0;
    signIn(async (url, init) => {
      if (url.pathname.endsWith('/me/profile') && init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body)) as { careerId?: string };
        current = { ...current, careerId: body.careerId ?? current.careerId };
        return json(200, current);
      }
      if (url.pathname.endsWith(PROFILE_PATH)) return json(200, current);
      if (url.pathname.endsWith('/auth/me')) {
        meCalls += 1;
        return json(200, {
          ...TEST_USER,
          profile: { ...TEST_USER.profile, careerId: current.careerId },
        });
      }
      return undefined;
    });
    renderRoutes(
      [
        {
          path: '/profile/edit',
          element: (
            <>
              <EditProfileScreen />
              <SessionCareer />
            </>
          ),
        },
        { path: '/profile', element: <SessionCareer /> },
      ],
      { route: '/profile/edit' },
    );

    await screen.findByDisplayValue('Carlos Gómez');
    expect(screen.getByTestId('session-career')).toHaveTextContent(
      TEST_CAREERS[0].id,
    );
    await screen.findByRole('option', { name: 'Medicina' });
    await user.selectOptions(screen.getByLabelText('Carrera'), 'Medicina');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() =>
      expect(screen.getByTestId('session-career')).toHaveTextContent(
        TEST_CAREERS[1].id,
      ),
    );
    expect(meCalls).toBeGreaterThanOrEqual(2);
  });
});
