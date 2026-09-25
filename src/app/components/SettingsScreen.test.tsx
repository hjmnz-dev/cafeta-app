import { describe, it, expect } from 'vitest';

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsScreen } from './SettingsScreen';
import { renderWithProviders } from '../../test/utils';

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
