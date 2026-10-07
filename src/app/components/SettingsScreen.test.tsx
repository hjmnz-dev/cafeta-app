import { describe, it, expect, vi } from 'vitest';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsScreen } from './SettingsScreen';
import { renderWithProviders } from '../../test/utils';
import { SESSION_KEY } from '../lib/http';
import { signIn } from '../../test/api';
import { Toaster } from './ui/sonner';
import { json } from '../../test/setup';

// HU04, cerrar sesión contra la API con fetch simulado (spec 0004, AC-8).
describe('HU04 · Cerrar sesión', () => {
  const USER = {
    id: '01926f00-0000-7000-8000-000000000001',
    email: 'cgomez@est.intec.edu.do',
    role: 'STUDENT',
    verificationStatus: 'PENDING',
    profile: {
      handle: 'cgomez_intec',
      displayName: 'Carlos Gómez',
      careerId: null,
    },
  };
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  /** Sesión recordada y confirmada; /auth/logout responde lo indicado. */
  function signedIn(logoutResponse: () => Response) {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        accessToken: 'activo',
        expiresAt: '2099-01-01T00:00:00.000Z',
      }),
    );
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) return Promise.resolve(json(200, USER));
      if (url.endsWith('/auth/logout'))
        return Promise.resolve(logoutResponse());
      return Promise.resolve(json(404, { code: 'NOT_FOUND' }));
    });
    return fetchMock;
  }

  it('AC-8: revoca la sesión en la API, borra la guardada y va al login', async () => {
    const user = userEvent.setup();
    const fetchMock = signedIn(() => new Response(null, { status: 204 }));
    renderWithProviders(<SettingsScreen />, { route: '/settings' });

    await user.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/login'),
    );
    const logoutCall = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith('/auth/logout'),
    );
    expect(logoutCall?.[1]?.method).toBe('POST');
    expect(
      (logoutCall?.[1]?.headers as Record<string, string> | undefined)
        ?.Authorization,
    ).toBe('Bearer activo');
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('AC-8: si la sesión ya estaba revocada en la API, igual borra la guardada y va al login', async () => {
    const user = userEvent.setup();
    signedIn(() => json(401, { statusCode: 401, code: 'SESSION_REVOKED' }));
    renderWithProviders(<SettingsScreen />, { route: '/settings' });

    await user.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/login'),
    );
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});

const STORAGE_KEY = 'cafeta.appstate.v1';
const readState = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
const renderSettingsWithToasts = () =>
  renderWithProviders(
    <>
      <SettingsScreen />
      <Toaster />
    </>,
    { route: '/settings' },
  );

describe('DEF-03 · HU06/07/08 — Configuración de cuenta', () => {
  it('HU06 — muestra las tres áreas: cuenta, privacidad y notificaciones', () => {
    renderWithProviders(<SettingsScreen />, { route: '/settings' });
    expect(screen.getByText('Cuenta')).toBeInTheDocument();
    expect(screen.getByText(/privacidad del perfil/i)).toBeInTheDocument();
    expect(screen.getByText('Notificaciones')).toBeInTheDocument();
  });

  it('HU07 E1 — cambiar la privacidad la guarda en la API y marca la opción', async () => {
    const user = userEvent.setup();
    let saved = 'PUBLIC';
    const fetchMock = signIn((url, init) => {
      if (!url.pathname.endsWith('/me/privacy')) return undefined;
      if (init?.method === 'PATCH') {
        saved = (JSON.parse(String(init.body)) as { visibility: string })
          .visibility;
      }
      return json(200, { visibility: saved });
    });
    renderSettingsWithToasts();

    // Las cuentas nuevas empiezan en Público (decisión 15).
    expect(
      await screen.findByRole('button', { name: /público/i }),
    ).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /solo seguidores/i }));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /solo seguidores/i }),
      ).toHaveAttribute('aria-pressed', 'true'),
    );
    expect(screen.getByRole('button', { name: /público/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    const patch = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'PATCH',
    );
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({
      visibility: 'FOLLOWERS',
    });
    expect(
      await screen.findByText('Privacidad actualizada'),
    ).toBeInTheDocument();
  });

  it('HU07 E2 — al volver a entrar se muestra la opción guardada en la API', async () => {
    signIn((url) =>
      url.pathname.endsWith('/me/privacy')
        ? json(200, { visibility: 'PRIVATE' })
        : undefined,
    );
    renderSettingsWithToasts();

    expect(
      await screen.findByRole('button', { name: /privado/i }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('HU07 — si la API falla al guardar, avisa y deja la opción anterior', async () => {
    const user = userEvent.setup();
    signIn((url, init) => {
      if (!url.pathname.endsWith('/me/privacy')) return undefined;
      return init?.method === 'PATCH'
        ? json(400, { statusCode: 400, code: 'VALIDATION_ERROR' })
        : json(200, { visibility: 'PUBLIC' });
    });
    renderSettingsWithToasts();

    await screen.findByRole('button', { name: /público/i, pressed: true });
    await user.click(screen.getByRole('button', { name: /privado/i }));

    expect(
      await screen.findByText('Revisa los datos del formulario.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /público/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('HU08 E1 — apagar "Comentarios" lo guarda en la API y deja los demás encendidos', async () => {
    const user = userEvent.setup();
    let saved = {
      reactions: true,
      comments: true,
      follows: true,
      messages: true,
      stories: true,
    };
    const fetchMock = signIn((url, init) => {
      if (!url.pathname.endsWith('/notifications/preferences')) {
        return undefined;
      }
      if (init?.method === 'PATCH') {
        saved = { ...saved, ...JSON.parse(String(init.body)) };
      }
      return json(200, saved);
    });
    renderSettingsWithToasts();

    const comments = await screen.findByRole('switch', {
      name: /notificaciones de comentarios/i,
    });
    await waitFor(() => expect(comments).toBeEnabled());
    expect(comments).toHaveAttribute('aria-checked', 'true');

    await user.click(comments);

    await waitFor(() =>
      expect(
        screen.getByRole('switch', { name: /notificaciones de comentarios/i }),
      ).toHaveAttribute('aria-checked', 'false'),
    );
    const patch = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'PATCH',
    );
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ comments: false });
    for (const other of ['reacciones', 'seguidores', 'mensajes', 'historias']) {
      expect(
        screen.getByRole('switch', {
          name: new RegExp(`notificaciones de ${other}`, 'i'),
        }),
      ).toHaveAttribute('aria-checked', 'true');
    }
    expect(
      await screen.findByText('Preferencias guardadas'),
    ).toBeInTheDocument();
    // Ya no se guardan en localStorage (AppState).
    expect(readState().settings?.notifications).toBeUndefined();
  });
});

describe('Apariencia — modo oscuro por defecto', () => {
  it('arranca en oscuro y lo refleja en <html>', () => {
    renderWithProviders(<SettingsScreen />, { route: '/settings' });

    expect(screen.getByRole('button', { name: /oscuro/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('se puede cambiar a claro desde Configuración', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsScreen />, { route: '/settings' });

    await user.click(screen.getByRole('button', { name: /claro/i }));

    expect(screen.getByRole('button', { name: /claro/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('la preferencia sobrevive a recargar la app', async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<SettingsScreen />, {
      route: '/settings',
    });

    await user.click(screen.getByRole('button', { name: /claro/i }));
    unmount();

    renderWithProviders(<SettingsScreen />, { route: '/settings' });
    expect(screen.getByRole('button', { name: /claro/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
