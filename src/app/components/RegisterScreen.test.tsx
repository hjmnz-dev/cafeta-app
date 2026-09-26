import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultFetch, TEST_CAREERS } from '../../test/setup';
import { renderWithProviders } from '../../test/utils';
import { SESSION_KEY } from '../lib/http';
import { RegisterScreen } from './RegisterScreen';

// Registro contra la API con fetch simulado (spec 0004, AC-1 a AC-4).
const FUTURE = '2099-01-01T00:00:00.000Z';
const [SOFTWARE] = TEST_CAREERS;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const AUTH_RESPONSE = {
  accessToken: 'token-registro',
  expiresAt: FUTURE,
  user: {
    id: '01926f00-0000-7000-8000-000000000001',
    email: 'cgomez@est.intec.edu.do',
    role: 'STUDENT',
    verificationStatus: 'PENDING',
    profile: {
      handle: 'cgomez_intec',
      displayName: 'Carlos Gómez',
      careerId: SOFTWARE?.id ?? null,
    },
  },
};

/** /auth/register responde lo indicado; el resto, el fetch por defecto. */
function registerResponds(response: () => Response) {
  const fetchMock = vi.mocked(fetch);
  fetchMock.mockImplementation((input) =>
    String(input).endsWith('/auth/register')
      ? Promise.resolve(response())
      : defaultFetch(input),
  );
  return fetchMock;
}

const registerBody = (fetchMock: ReturnType<typeof registerResponds>) => {
  const call = fetchMock.mock.calls.find(([input]) =>
    String(input).endsWith('/auth/register'),
  );
  return call ? JSON.parse(String(call[1]?.body)) : undefined;
};

interface Form {
  nombre: string;
  apellido: string;
  email: string;
  handle: string;
  career: string;
  password: string;
  confirm: string;
  terms: boolean;
}

const VALID: Form = {
  nombre: 'Carlos',
  apellido: 'Gómez',
  email: 'cgomez@est.intec.edu.do',
  handle: 'cgomez_intec',
  career: SOFTWARE?.name ?? '',
  password: 'clave-segura-2026',
  confirm: 'clave-segura-2026',
  terms: true,
};

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  overrides: Partial<Form> = {},
) {
  const form = { ...VALID, ...overrides };
  // Las carreras llegan de GET /careers antes de poder elegir.
  await screen.findByRole('option', { name: SOFTWARE?.name });
  if (form.nombre)
    await user.type(screen.getByPlaceholderText('Juan'), form.nombre);
  if (form.apellido)
    await user.type(screen.getByPlaceholderText('Pérez'), form.apellido);
  if (form.email)
    await user.type(
      screen.getByPlaceholderText('tu@est.intec.edu.do'),
      form.email,
    );
  if (form.handle)
    await user.type(screen.getByLabelText('Nombre de usuario'), form.handle);
  if (form.career)
    await user.selectOptions(screen.getByLabelText('Carrera'), form.career);
  const [password, confirm] = screen.getAllByPlaceholderText('••••••••');
  if (form.password && password) await user.type(password, form.password);
  if (form.confirm && confirm) await user.type(confirm, form.confirm);
  if (form.terms)
    await user.click(screen.getByRole('checkbox', { name: /acepto los/i }));
  await user.click(screen.getByRole('button', { name: 'Registrarse' }));
}

describe('Registro: catálogo de carreras', () => {
  it('AC-4: el selector muestra las carreras que da la API', async () => {
    renderWithProviders(<RegisterScreen />, { route: '/register' });
    for (const career of TEST_CAREERS) {
      expect(
        await screen.findByRole('option', { name: career.name }),
      ).toBeInTheDocument();
    }
  });

  it('si no se pueden cargar las carreras avisa con un mensaje traducido', async () => {
    vi.mocked(fetch).mockResolvedValue(
      json(500, {
        statusCode: 500,
        message: 'boom',
        code: 'INTERNAL_SERVER_ERROR',
      }),
    );
    renderWithProviders(<RegisterScreen />, { route: '/register' });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Algo salió mal. Intenta de nuevo.',
    );
  });
});

describe('Registro contra la API', () => {
  it('AC-1: un registro válido manda los datos normalizados, guarda la sesión y va al feed', async () => {
    const user = userEvent.setup();
    const fetchMock = registerResponds(() => json(201, AUTH_RESPONSE));
    renderWithProviders(<RegisterScreen />, { route: '/register' });

    await fillAndSubmit(user, {
      nombre: '  Carlos ',
      email: ' cgomez@est.intec.edu.do ',
      handle: 'CGomez_Intec',
    });

    expect(await screen.findByText('/home')).toBeInTheDocument();
    expect(registerBody(fetchMock)).toEqual({
      email: 'cgomez@est.intec.edu.do',
      password: 'clave-segura-2026',
      firstName: 'Carlos',
      lastName: 'Gómez',
      handle: 'cgomez_intec',
      careerId: SOFTWARE?.id,
      acceptTerms: true,
    });
    expect(sessionStorage.getItem(SESSION_KEY)).toContain('token-registro');
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it.each([
    [
      'AC-2',
      400,
      'EMAIL_NOT_INSTITUTIONAL',
      'Usa tu correo institucional de INTEC.',
    ],
    ['AC-3', 409, 'EMAIL_TAKEN', 'Ya existe una cuenta con ese correo.'],
    ['AC-3', 409, 'HANDLE_TAKEN', 'Ese nombre de usuario ya está en uso.'],
    ['AC-4', 400, 'CAREER_NOT_FOUND', 'Elige una carrera de la lista.'],
  ])(
    '%s: %i %s muestra "%s" junto al campo y se queda en el registro',
    async (_ac, status, code, message) => {
      const user = userEvent.setup();
      registerResponds(() =>
        json(status, { statusCode: status, message: 'texto interno', code }),
      );
      renderWithProviders(<RegisterScreen />, { route: '/register' });

      await fillAndSubmit(user);

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(screen.queryByText('texto interno')).not.toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent('/register');
      expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
    },
  );

  it.each([
    ['AC-4', 400, 'VALIDATION_ERROR', 'Revisa los datos del formulario.'],
    [
      'AC-11',
      429,
      'TOO_MANY_REQUESTS',
      'Demasiados intentos. Espera un minuto.',
    ],
  ])(
    '%s: %i %s se muestra como aviso general',
    async (_ac, status, code, message) => {
      const user = userEvent.setup();
      registerResponds(() => json(status, { statusCode: status, code }));
      renderWithProviders(<RegisterScreen />, { route: '/register' });

      await fillAndSubmit(user);

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
    },
  );
});

describe('Registro: validación antes de llamar a la API', () => {
  it.each([
    [
      'sin número',
      'sololetras',
      'La contraseña debe tener al menos una letra y un número',
    ],
    ['corta', 'abc1', 'La contraseña debe tener de 8 a 72 caracteres'],
  ])(
    'AC-4: una contraseña %s se rechaza sin llamar a la API',
    async (_caso, password, message) => {
      const user = userEvent.setup();
      const fetchMock = registerResponds(() => json(201, AUTH_RESPONSE));
      renderWithProviders(<RegisterScreen />, { route: '/register' });

      await fillAndSubmit(user, { password, confirm: password });

      expect(screen.getByText(message)).toBeInTheDocument();
      expect(registerBody(fetchMock)).toBeUndefined();
    },
  );

  it('AC-4: un handle con caracteres no permitidos se rechaza', async () => {
    const user = userEvent.setup();
    const fetchMock = registerResponds(() => json(201, AUTH_RESPONSE));
    renderWithProviders(<RegisterScreen />, { route: '/register' });

    await fillAndSubmit(user, { handle: 'c-gomez!' });

    expect(
      screen.getByText('Usa de 3 a 30 letras, números, punto o guion bajo'),
    ).toBeInTheDocument();
    expect(registerBody(fetchMock)).toBeUndefined();
  });

  it('AC-4: sin aceptar los términos no se puede registrar', async () => {
    const user = userEvent.setup();
    const fetchMock = registerResponds(() => json(201, AUTH_RESPONSE));
    renderWithProviders(<RegisterScreen />, { route: '/register' });

    await fillAndSubmit(user, { terms: false });

    expect(
      screen.getByText('Debes aceptar los términos y condiciones'),
    ).toBeInTheDocument();
    expect(registerBody(fetchMock)).toBeUndefined();
  });

  it('AC-4: sin elegir carrera no se puede registrar', async () => {
    const user = userEvent.setup();
    const fetchMock = registerResponds(() => json(201, AUTH_RESPONSE));
    renderWithProviders(<RegisterScreen />, { route: '/register' });

    await fillAndSubmit(user, { career: '' });

    expect(screen.getAllByText('Elige tu carrera').length).toBeGreaterThan(1);
    expect(registerBody(fetchMock)).toBeUndefined();
  });

  it('las contraseñas que no coinciden se rechazan', async () => {
    const user = userEvent.setup();
    const fetchMock = registerResponds(() => json(201, AUTH_RESPONSE));
    renderWithProviders(<RegisterScreen />, { route: '/register' });

    await fillAndSubmit(user, { confirm: 'otra-clave-2026' });

    expect(
      screen.getByText('Las contraseñas no coinciden'),
    ).toBeInTheDocument();
    expect(registerBody(fetchMock)).toBeUndefined();
  });

  it('el formulario vacío marca todos los campos requeridos', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterScreen />, { route: '/register' });

    await user.click(screen.getByRole('button', { name: 'Registrarse' }));

    for (const message of [
      'El nombre es requerido',
      'El apellido es requerido',
      'El correo electrónico es requerido',
      'La contraseña es requerida',
      'Confirma tu contraseña',
      'Debes aceptar los términos y condiciones',
    ]) {
      expect(screen.getByText(message)).toBeInTheDocument();
    }
  });
});
