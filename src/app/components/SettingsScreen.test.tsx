import { describe, it, expect, vi } from 'vitest';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsScreen } from './SettingsScreen';
import { renderWithProviders } from '../../test/utils';
import { SESSION_KEY } from '../lib/http';

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

describe('DEF-03 · HU06/07/08 — Configuración de cuenta', () => {
  it('HU06 — muestra las tres áreas: cuenta, privacidad y notificaciones', () => {
    renderWithProviders(<SettingsScreen />, { route: '/settings' });
    expect(screen.getByText('Cuenta')).toBeInTheDocument();
    expect(screen.getByText(/privacidad del perfil/i)).toBeInTheDocument();
    expect(screen.getByText('Notificaciones')).toBeInTheDocument();
  });

  it('HU07 — cambiar la privacidad marca la opción y la persiste', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsScreen />, { route: '/settings' });

    // Por defecto: Público
    expect(screen.getByRole('button', { name: /público/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: /privado/i }));

    expect(screen.getByRole('button', { name: /privado/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /público/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(readState().settings.visibility).toBe('private');
  });

  it('HU08 — alternar una preferencia de notificación cambia y persiste su estado', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsScreen />, { route: '/settings' });

    const switches = screen.getAllByRole('switch');
    // Primera preferencia = "Reacciones", activa por defecto
    expect(switches[0]).toHaveAttribute('aria-checked', 'true');

    await user.click(switches[0]);

    expect(switches[0]).toHaveAttribute('aria-checked', 'false');
    expect(readState().settings.notifications.likes).toBe(false);
  });

  it('HU06 — la preferencia persiste al volver a montar la pantalla', async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<SettingsScreen />, {
      route: '/settings',
    });

    await user.click(screen.getByRole('button', { name: /solo seguidores/i }));
    unmount();

    renderWithProviders(<SettingsScreen />, { route: '/settings' });
    expect(
      screen.getByRole('button', { name: /solo seguidores/i }),
    ).toHaveAttribute('aria-pressed', 'true');
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
