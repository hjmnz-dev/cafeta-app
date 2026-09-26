import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';
import { LocationProbe, renderWithProviders } from '../../test/utils';
import { defaultFetch } from '../../test/setup';
import { SESSION_KEY } from '../lib/http';
import { SessionProvider } from '../store/SessionStore';

// Login contra la API con fetch simulado (spec 0004).
const EMAIL = 'cgomez@est.intec.edu.do';
const PASSWORD = 'clave-segura-2026';
const FUTURE = '2099-01-01T00:00:00.000Z';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const AUTH_RESPONSE = {
  accessToken: 'token-login',
  expiresAt: FUTURE,
  user: {
    id: '01926f00-0000-7000-8000-000000000001',
    email: EMAIL,
    role: 'STUDENT',
    verificationStatus: 'PENDING',
    profile: {
      handle: 'cgomez_intec',
      displayName: 'Carlos Gómez',
      careerId: null,
    },
  },
};

/** /auth/login responde lo indicado; el resto, el fetch por defecto. */
function loginResponds(response: () => Response) {
  const fetchMock = vi.mocked(fetch);
  fetchMock.mockImplementation((input) =>
    String(input).endsWith('/auth/login')
      ? Promise.resolve(response())
      : defaultFetch(input),
  );
  return fetchMock;
}

const loginBody = (fetchMock: ReturnType<typeof loginResponds>) => {
  const call = fetchMock.mock.calls.find(([input]) =>
    String(input).endsWith('/auth/login'),
  );
  return call ? JSON.parse(String(call[1]?.body)) : undefined;
};

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  { email = EMAIL, password = PASSWORD } = {},
) {
  if (email)
    await user.type(screen.getByPlaceholderText('tu@est.intec.edu.do'), email);
  if (password)
    await user.type(screen.getByPlaceholderText('••••••••'), password);
  await user.click(screen.getByRole('button', { name: 'Iniciar Sesión' }));
}

describe('Login contra la API', () => {
  it('AC-5: credenciales correctas guardan la sesión en sessionStorage y van al feed', async () => {
    const user = userEvent.setup();
    const fetchMock = loginResponds(() => json(200, AUTH_RESPONSE));
    renderWithProviders(<LoginScreen />, { route: '/login' });

    await fillAndSubmit(user);

    expect(await screen.findByText('/home')).toBeInTheDocument();
    expect(loginBody(fetchMock)).toEqual({
      email: EMAIL,
      password: PASSWORD,
      remember: false,
    });
    expect(sessionStorage.getItem(SESSION_KEY)).toContain('token-login');
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('AC-5: con "Recordarme" manda remember y guarda la sesión en localStorage', async () => {
    const user = userEvent.setup();
    const fetchMock = loginResponds(() => json(200, AUTH_RESPONSE));
    renderWithProviders(<LoginScreen />, { route: '/login' });

    await user.click(screen.getByRole('checkbox', { name: /recordarme/i }));
    await fillAndSubmit(user);

    expect(await screen.findByText('/home')).toBeInTheDocument();
    expect(loginBody(fetchMock)).toMatchObject({ remember: true });
    expect(localStorage.getItem(SESSION_KEY)).toContain('token-login');
  });

  it('manda el correo sin espacios alrededor', async () => {
    const user = userEvent.setup();
    const fetchMock = loginResponds(() => json(200, AUTH_RESPONSE));
    renderWithProviders(<LoginScreen />, { route: '/login' });

    await fillAndSubmit(user, { email: `  ${EMAIL}  ` });

    expect(await screen.findByText('/home')).toBeInTheDocument();
    expect(loginBody(fetchMock).email).toBe(EMAIL);
  });

  it('AC-9: después de entrar vuelve a la pantalla protegida que se pidió', async () => {
    const user = userEvent.setup();
    loginResponds(() => json(200, AUTH_RESPONSE));
    render(
      <SessionProvider>
        <MemoryRouter
          initialEntries={[
            { pathname: '/login', state: { from: '/messages' } },
          ]}
        >
          <LocationProbe />
          <Routes>
            <Route path="*" element={<LoginScreen />} />
          </Routes>
        </MemoryRouter>
      </SessionProvider>,
    );

    await fillAndSubmit(user);

    expect(await screen.findByText('/messages')).toBeInTheDocument();
  });

  it.each([
    ['AC-6', 401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.'],
    ['AC-7', 403, 'ACCOUNT_INACTIVE', 'Tu cuenta no está activa.'],
    [
      'AC-11',
      429,
      'TOO_MANY_REQUESTS',
      'Demasiados intentos. Espera un minuto.',
    ],
  ])(
    '%s: %i %s muestra "%s" y se queda en el login',
    async (_ac, status, code, message) => {
      const user = userEvent.setup();
      loginResponds(() =>
        json(status, {
          statusCode: status,
          message: 'texto interno de la API',
          code,
        }),
      );
      renderWithProviders(<LoginScreen />, { route: '/login' });

      await fillAndSubmit(user);

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(
        screen.queryByText('texto interno de la API'),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent('/login');
      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    },
  );

  it('sin conexión muestra el aviso de red y el botón vuelve a estar activo', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    renderWithProviders(<LoginScreen />, { route: '/login' });

    await fillAndSubmit(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No hay conexión con Cafeta. Intenta de nuevo.',
    );
    expect(
      screen.getByRole('button', { name: 'Iniciar Sesión' }),
    ).toBeEnabled();
  });

  it('con campos vacíos avisa en el formulario y no llama a la API', async () => {
    const user = userEvent.setup();
    const fetchMock = loginResponds(() => json(200, AUTH_RESPONSE));
    renderWithProviders(<LoginScreen />, { route: '/login' });

    await fillAndSubmit(user, { email: '', password: '' });

    expect(
      screen.getByText('El correo electrónico es requerido'),
    ).toBeInTheDocument();
    expect(screen.getByText('La contraseña es requerida')).toBeInTheDocument();
    expect(loginBody(fetchMock)).toBeUndefined();
  });

  it('con un correo mal escrito avisa y no llama a la API', async () => {
    const user = userEvent.setup();
    const fetchMock = loginResponds(() => json(200, AUTH_RESPONSE));
    renderWithProviders(<LoginScreen />, { route: '/login' });

    await fillAndSubmit(user, { email: 'cgomez@intec' });

    expect(
      screen.getByText('Ingresa un correo electrónico válido'),
    ).toBeInTheDocument();
    expect(loginBody(fetchMock)).toBeUndefined();
  });

  it('mientras espera a la API desactiva el botón para no enviar dos veces', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(() => new Promise(() => undefined));
    renderWithProviders(<LoginScreen />, { route: '/login' });

    await fillAndSubmit(user);

    expect(
      await screen.findByRole('button', { name: 'Entrando…' }),
    ).toBeDisabled();
  });
});

describe('Login — mostrar y ocultar la contraseña', () => {
  it('hay un solo botón para ver los caracteres, y alterna el campo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginScreen />, { route: '/login' });

    const campo = screen.getByPlaceholderText('••••••••');
    expect(campo).toHaveAttribute('type', 'password');

    // Un único control propio: el nativo del navegador se oculta por CSS.
    const ojos = screen.getAllByRole('button', {
      name: /^mostrar contraseña$/i,
    });
    expect(ojos).toHaveLength(1);

    await user.click(ojos[0]);
    expect(campo).toHaveAttribute('type', 'text');

    await user.click(
      screen.getByRole('button', { name: /ocultar contraseña/i }),
    );
    expect(campo).toHaveAttribute('type', 'password');
  });
});

describe('Casillas de verificación de los formularios', () => {
  it('"Recordarme" distingue marcado de sin marcar y se puede usar con teclado', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginScreen />, { route: '/login' });

    const casilla = screen.getByRole('checkbox', { name: /recordarme/i });
    expect(casilla).not.toBeChecked();

    // Pulsar sobre el texto de la etiqueta también la marca.
    await user.click(screen.getByText('Recordarme'));
    expect(casilla).toBeChecked();

    await user.click(screen.getByText('Recordarme'));
    expect(casilla).not.toBeChecked();
  });

  it('el registro exige aceptar los términos y marca la casilla como error', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterScreen />, { route: '/register' });

    const casilla = screen.getByRole('checkbox', { name: /acepto los/i });
    expect(casilla).not.toBeChecked();

    await user.click(casilla);
    expect(casilla).toBeChecked();
  });
});
