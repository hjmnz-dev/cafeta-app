import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultFetch } from '../../test/setup';
import { SESSION_ENDED_EVENT, SESSION_KEY } from '../lib/http';
import type { RegisterInput } from '../lib/auth-api';
import { SessionProvider, useSession } from './SessionStore';

// SessionStore (spec 0004): estado de la sesión y dónde se guarda el token.
// fetch es el único borde simulado.
const FUTURE = '2099-01-01T00:00:00.000Z';

const USER = {
  id: '01926f00-0000-7000-8000-000000000001',
  email: 'cgomez@est.intec.edu.do',
  role: 'STUDENT' as const,
  verificationStatus: 'PENDING' as const,
  profile: {
    handle: 'cgomez_intec',
    displayName: 'Carlos Gómez',
    careerId: null,
  },
};

const REGISTRATION: RegisterInput = {
  email: 'cgomez@est.intec.edu.do',
  password: 'clave-segura-2026',
  firstName: 'Carlos',
  lastName: 'Gómez',
  handle: 'cgomez_intec',
  careerId: '01926f00-0000-7000-8000-0000000000c1',
  acceptTerms: true,
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const authResponse = (accessToken: string) =>
  json(200, { accessToken, expiresAt: FUTURE, user: USER });

type Route = (url: string, init?: RequestInit) => Response | undefined;

/** Responde por ruta; lo que no se cubre cae en el fetch por defecto. */
function routeFetch(route: Route) {
  const fetchMock = vi.mocked(fetch);
  fetchMock.mockImplementation((input, init) => {
    const url = String(input);
    const res = route(url, init);
    return res ? Promise.resolve(res) : defaultFetch(input);
  });
  return fetchMock;
}

const callsTo = (fetchMock: ReturnType<typeof routeFetch>, path: string) =>
  fetchMock.mock.calls.filter(([input]) => String(input).endsWith(path));

const storeSession = (storage: Storage, accessToken = 'guardado') =>
  storage.setItem(
    SESSION_KEY,
    JSON.stringify({ accessToken, expiresAt: FUTURE }),
  );

/** Muestra el estado y ofrece las acciones como botones. */
function Probe() {
  const { status, user, login, register, logout } = useSession();
  return (
    <div>
      <p data-testid="status">{status}</p>
      <p data-testid="handle">{user?.profile.handle ?? ''}</p>
      <button
        onClick={() => void login('cgomez@est.intec.edu.do', 'x1234567', true)}
      >
        login recordado
      </button>
      <button
        onClick={() => void login('cgomez@est.intec.edu.do', 'x1234567', false)}
      >
        login corto
      </button>
      <button onClick={() => void register(REGISTRATION)}>registrar</button>
      {/* Sin catch a propósito: si logout rechazara, Vitest lo marcaría. */}
      <button onClick={() => void logout()}>salir</button>
    </div>
  );
}

const renderProbe = () =>
  render(
    <SessionProvider>
      <Probe />
    </SessionProvider>,
  );

const status = () => screen.getByTestId('status');

describe('SessionStore al cargar', () => {
  it('sin sesión guardada arranca anónimo y no llama a /auth/me', () => {
    const fetchMock = routeFetch(() => undefined);
    renderProbe();
    expect(status()).toHaveTextContent('anonymous');
    expect(callsTo(fetchMock, '/auth/me')).toHaveLength(0);
  });

  it('AC-5: con sesión guardada la confirma con /auth/me y queda autenticado', async () => {
    storeSession(localStorage, 'recordado');
    const fetchMock = routeFetch((url) =>
      url.endsWith('/auth/me') ? json(200, USER) : undefined,
    );
    renderProbe();

    expect(status()).toHaveTextContent('loading');
    await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('handle')).toHaveTextContent('cgomez_intec');
    const [, init] = callsTo(fetchMock, '/auth/me')[0] ?? [];
    expect(
      (init?.headers as Record<string, string> | undefined)?.Authorization,
    ).toBe('Bearer recordado');
  });

  it('AC-8: si /auth/me responde 401, queda anónimo y borra la sesión guardada', async () => {
    storeSession(sessionStorage);
    routeFetch(() => undefined); // /auth/me → 401 por defecto
    renderProbe();

    await waitFor(() => expect(status()).toHaveTextContent('anonymous'));
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('si /auth/me falla por red, queda anónimo', async () => {
    storeSession(localStorage);
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    renderProbe();
    await waitFor(() => expect(status()).toHaveTextContent('anonymous'));
  });
});

describe('SessionStore: login, registro y cierre', () => {
  it('AC-5: login con "Recordarme" guarda en localStorage y manda remember true', async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch((url) =>
      url.endsWith('/auth/login') ? authResponse('largo') : undefined,
    );
    renderProbe();

    await user.click(screen.getByRole('button', { name: 'login recordado' }));

    await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
    expect(JSON.parse(localStorage.getItem(SESSION_KEY) ?? '{}')).toEqual({
      accessToken: 'largo',
      expiresAt: FUTURE,
    });
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    const [, init] = callsTo(fetchMock, '/auth/login')[0] ?? [];
    expect(JSON.parse(String(init?.body))).toMatchObject({ remember: true });
  });

  it('AC-5: login sin "Recordarme" guarda en sessionStorage', async () => {
    const user = userEvent.setup();
    routeFetch((url) =>
      url.endsWith('/auth/login') ? authResponse('corto') : undefined,
    );
    renderProbe();

    await user.click(screen.getByRole('button', { name: 'login corto' }));

    await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
    expect(sessionStorage.getItem(SESSION_KEY)).toContain('corto');
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('AC-1: registrarse deja la sesión en sessionStorage', async () => {
    const user = userEvent.setup();
    const fetchMock = routeFetch((url) =>
      url.endsWith('/auth/register') ? authResponse('nuevo') : undefined,
    );
    renderProbe();

    await user.click(screen.getByRole('button', { name: 'registrar' }));

    await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
    expect(sessionStorage.getItem(SESSION_KEY)).toContain('nuevo');
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    const [, init] = callsTo(fetchMock, '/auth/register')[0] ?? [];
    expect(JSON.parse(String(init?.body))).toEqual(REGISTRATION);
  });

  it('un login fallido no cambia el estado ni guarda nada', async () => {
    const user = userEvent.setup();
    routeFetch((url) =>
      url.endsWith('/auth/login')
        ? json(401, { statusCode: 401, code: 'INVALID_CREDENTIALS' })
        : undefined,
    );
    const onError = vi.fn();
    function FailingProbe() {
      const { status: s, login } = useSession();
      return (
        <>
          <p data-testid="status">{s}</p>
          <button
            onClick={() =>
              void login('a@est.intec.edu.do', 'mala1234', true).catch(onError)
            }
          >
            entrar
          </button>
        </>
      );
    }
    render(
      <SessionProvider>
        <FailingProbe />
      </SessionProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'entrar' }));

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError.mock.calls[0]?.[0]).toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(status()).toHaveTextContent('anonymous');
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('AC-8: cerrar sesión llama a /auth/logout con el token, borra la sesión y queda anónimo', async () => {
    storeSession(localStorage, 'activo');
    const user = userEvent.setup();
    const fetchMock = routeFetch((url) => {
      if (url.endsWith('/auth/me')) return json(200, USER);
      if (url.endsWith('/auth/logout'))
        return new Response(null, { status: 204 });
      return undefined;
    });
    renderProbe();
    await waitFor(() => expect(status()).toHaveTextContent('authenticated'));

    await user.click(screen.getByRole('button', { name: 'salir' }));

    await waitFor(() => expect(status()).toHaveTextContent('anonymous'));
    const [, init] = callsTo(fetchMock, '/auth/logout')[0] ?? [];
    expect(init?.method).toBe('POST');
    expect(
      (init?.headers as Record<string, string> | undefined)?.Authorization,
    ).toBe('Bearer activo');
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('AC-8: aunque la API no responda al cerrar sesión, la sesión local se borra', async () => {
    storeSession(localStorage, 'activo');
    const user = userEvent.setup();
    routeFetch((url) => {
      if (url.endsWith('/auth/me')) return json(200, USER);
      if (url.endsWith('/auth/logout'))
        return json(500, { statusCode: 500, code: 'INTERNAL_SERVER_ERROR' });
      return undefined;
    });
    renderProbe();
    await waitFor(() => expect(status()).toHaveTextContent('authenticated'));

    await user.click(screen.getByRole('button', { name: 'salir' }));

    await waitFor(() => expect(status()).toHaveTextContent('anonymous'));
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('AC-8: el evento cafeta:session-ended de cualquier 401 pasa la app a anónimo', async () => {
    storeSession(localStorage);
    routeFetch((url) =>
      url.endsWith('/auth/me') ? json(200, USER) : undefined,
    );
    renderProbe();
    await waitFor(() => expect(status()).toHaveTextContent('authenticated'));

    act(() => {
      window.dispatchEvent(new Event(SESSION_ENDED_EVENT));
    });

    expect(status()).toHaveTextContent('anonymous');
    expect(screen.getByTestId('handle')).toHaveTextContent('');
  });
});

describe('useSession', () => {
  it('fuera de SessionProvider avisa con un error claro', () => {
    // React y jsdom reportan el error esperado; se silencia para no ensuciar la salida.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const swallow = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener('error', swallow);
    function Orphan() {
      useSession();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow(
      'useSession debe usarse dentro de SessionProvider',
    );
    window.removeEventListener('error', swallow);
    vi.mocked(console.error).mockRestore();
  });
});
