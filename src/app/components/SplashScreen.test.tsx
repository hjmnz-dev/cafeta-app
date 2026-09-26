import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SESSION_KEY } from '../lib/http';
import { renderWithProviders } from '../../test/utils';
import { SplashScreen } from './SplashScreen';

// Portada (spec 0004): con sesión va directo al feed.
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

describe('SplashScreen', () => {
  it('sin sesión ofrece crear cuenta e iniciar sesión', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SplashScreen />, { route: '/' });

    await user.click(
      screen.getByRole('button', { name: 'Crear cuenta con correo INTEC' }),
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/register');
  });

  it('el botón de iniciar sesión lleva al login', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SplashScreen />, { route: '/' });
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('AC-5: con una sesión guardada y confirmada va directo a /home', async () => {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        accessToken: 't',
        expiresAt: '2099-01-01T00:00:00.000Z',
      }),
    );
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(USER), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    renderWithProviders(<SplashScreen />, { route: '/' });
    expect(await screen.findByText('/home')).toBeInTheDocument();
  });
});
