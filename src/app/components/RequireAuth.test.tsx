import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { SESSION_KEY } from '../lib/http';
import { SessionProvider } from '../store/SessionStore';
import { RequireAuth } from './RequireAuth';

// Guardia de rutas (spec 0004, AC-9): sin sesión nunca se ve lo protegido.
const FUTURE = '2099-01-01T00:00:00.000Z';
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

function LoginProbe() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '';
  return <p>login, venía de {from}</p>;
}

const renderAt = (path: string) =>
  render(
    <SessionProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<LoginProbe />} />
          <Route element={<RequireAuth />}>
            <Route path="/messages" element={<p>mensajes privados</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </SessionProvider>,
  );

const storeSession = () =>
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ accessToken: 't', expiresAt: FUTURE }),
  );

describe('RequireAuth', () => {
  it('AC-9: sin sesión manda al login recordando la ruta pedida', () => {
    renderAt('/messages');
    expect(screen.getByText('login, venía de /messages')).toBeInTheDocument();
    expect(screen.queryByText('mensajes privados')).not.toBeInTheDocument();
  });

  it('mientras confirma la sesión no muestra nada protegido', () => {
    storeSession();
    // /auth/me no responde todavía.
    vi.mocked(fetch).mockImplementation(() => new Promise(() => undefined));
    const { container } = renderAt('/messages');
    expect(container).toBeEmptyDOMElement();
  });

  it('con sesión confirmada muestra la ruta protegida', async () => {
    storeSession();
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(USER), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    renderAt('/messages');
    expect(await screen.findByText('mensajes privados')).toBeInTheDocument();
  });

  it('AC-8 y AC-9: una sesión guardada que la API rechaza termina en el login', async () => {
    storeSession(); // /auth/me → 401 por defecto
    renderAt('/messages');
    expect(
      await screen.findByText('login, venía de /messages'),
    ).toBeInTheDocument();
    expect(screen.queryByText('mensajes privados')).not.toBeInTheDocument();
  });
});
