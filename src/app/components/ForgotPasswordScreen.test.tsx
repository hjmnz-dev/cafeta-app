import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';
import { renderWithProviders } from '../../test/utils';
import { defaultFetch, json } from '../../test/setup';

// Recuperar contraseña, paso 1: pedir el enlace a la API (spec 0008, decisión 10).
const EMAIL = 'juan@est.intec.edu.do';

/** /auth/forgot-password responde lo indicado; el resto, el fetch por defecto. */
function forgotResponds(response: () => Response) {
  const fetchMock = vi.mocked(fetch);
  fetchMock.mockImplementation((input) =>
    String(input).endsWith('/auth/forgot-password')
      ? Promise.resolve(response())
      : defaultFetch(input),
  );
  return fetchMock;
}

const forgotCalls = (fetchMock: ReturnType<typeof forgotResponds>) =>
  fetchMock.mock.calls.filter(([input]) =>
    String(input).endsWith('/auth/forgot-password'),
  );

async function typeEmail(
  user: ReturnType<typeof userEvent.setup>,
  email = EMAIL,
) {
  await user.type(screen.getByPlaceholderText(/est\.intec\.edu\.do/i), email);
}

describe('HU03 · Recuperar contraseña (pedir el enlace)', () => {
  it('rechaza un correo con formato inválido y no llama a la API', async () => {
    const user = userEvent.setup();
    const fetchMock = forgotResponds(() => json(204, null));
    renderWithProviders(<ForgotPasswordScreen />, {
      route: '/forgot-password',
    });

    await typeEmail(user, 'correo-invalido');
    await user.click(screen.getByRole('button', { name: /enviar enlace/i }));

    expect(screen.getByText(/correo electrónico válido/i)).toBeInTheDocument();
    expect(forgotCalls(fetchMock)).toHaveLength(0);
  });

  it('un correo vacío pide el correo y no llama a la API', async () => {
    const user = userEvent.setup();
    const fetchMock = forgotResponds(() => json(204, null));
    renderWithProviders(<ForgotPasswordScreen />, {
      route: '/forgot-password',
    });

    await user.click(screen.getByRole('button', { name: /enviar enlace/i }));

    expect(screen.getByText(/correo electrónico es requerido/i)).toBeVisible();
    expect(forgotCalls(fetchMock)).toHaveLength(0);
  });

  it('HU03 E1: con un correo válido pide el enlace y avisa que revise su correo', async () => {
    const user = userEvent.setup();
    const fetchMock = forgotResponds(() => new Response(null, { status: 204 }));
    renderWithProviders(<ForgotPasswordScreen />, {
      route: '/forgot-password',
    });

    await typeEmail(user, `  ${EMAIL}  `);
    await user.click(screen.getByRole('button', { name: /enviar enlace/i }));

    expect(await screen.findByText(/revisa tu correo/i)).toBeInTheDocument();
    const calls = forgotCalls(fetchMock);
    expect(calls).toHaveLength(1);
    expect(JSON.parse(String(calls[0]?.[1]?.body))).toEqual({ email: EMAIL });
    expect(screen.getByText(/30 minutos/i)).toBeInTheDocument();
  });

  it('HU03 E2: la confirmación no afirma que la cuenta exista', async () => {
    const user = userEvent.setup();
    forgotResponds(() => new Response(null, { status: 204 }));
    renderWithProviders(<ForgotPasswordScreen />, {
      route: '/forgot-password',
    });

    await typeEmail(user);
    await user.click(screen.getByRole('button', { name: /enviar enlace/i }));

    expect(await screen.findByText(/si hay una cuenta con/i)).toBeVisible();
  });

  it('el límite de pedidos muestra el mensaje en español y se queda en el formulario', async () => {
    const user = userEvent.setup();
    forgotResponds(() =>
      json(429, { statusCode: 429, code: 'TOO_MANY_REQUESTS', message: 'x' }),
    );
    renderWithProviders(<ForgotPasswordScreen />, {
      route: '/forgot-password',
    });

    await typeEmail(user);
    await user.click(screen.getByRole('button', { name: /enviar enlace/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Demasiados intentos. Espera un minuto.',
    );
    expect(screen.queryByText(/revisa tu correo/i)).not.toBeInTheDocument();
  });

  it('reenviar vuelve a llamar a la API y avisa que el enlace anterior ya no sirve', async () => {
    const user = userEvent.setup();
    const fetchMock = forgotResponds(() => new Response(null, { status: 204 }));
    renderWithProviders(<ForgotPasswordScreen />, {
      route: '/forgot-password',
    });
    await typeEmail(user);
    await user.click(screen.getByRole('button', { name: /enviar enlace/i }));
    await screen.findByText(/revisa tu correo/i);

    await user.click(screen.getByRole('button', { name: /reenviar enlace/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      /el anterior ya no sirve/i,
    );
    expect(forgotCalls(fetchMock)).toHaveLength(2);
  });

  it('desde la confirmación, "Volver a iniciar sesión" va al login', async () => {
    const user = userEvent.setup();
    forgotResponds(() => new Response(null, { status: 204 }));
    renderWithProviders(<ForgotPasswordScreen />, {
      route: '/forgot-password',
    });
    await typeEmail(user);
    await user.click(screen.getByRole('button', { name: /enviar enlace/i }));
    await screen.findByText(/revisa tu correo/i);

    await user.click(
      screen.getByRole('button', { name: /volver a iniciar sesión/i }),
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('la flecha de volver regresa al login desde el formulario', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordScreen />, {
      route: '/forgot-password',
    });

    await user.click(screen.getByRole('button', { name: 'Volver' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });
});
