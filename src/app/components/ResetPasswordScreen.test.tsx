import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResetPasswordScreen } from './ResetPasswordScreen';
import { renderWithProviders } from '../../test/utils';
import { defaultFetch, json } from '../../test/setup';

// Recuperar contraseña, paso 2: la pantalla del enlace (spec 0008, decisión 10).
const TOKEN = 'dGVzdC10b2tlbi1kZS1wcnVlYmFzLTAxMjM0NTY3ODk';
const ROUTE = `/reset-password?token=${TOKEN}`;

/** /auth/reset-password responde lo indicado; el resto, el fetch por defecto. */
function resetResponds(response: () => Response) {
  const fetchMock = vi.mocked(fetch);
  fetchMock.mockImplementation((input) =>
    String(input).endsWith('/auth/reset-password')
      ? Promise.resolve(response())
      : defaultFetch(input),
  );
  return fetchMock;
}

const resetCalls = (fetchMock: ReturnType<typeof resetResponds>) =>
  fetchMock.mock.calls.filter(([input]) =>
    String(input).endsWith('/auth/reset-password'),
  );

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  password: string,
  confirm = password,
) {
  await user.type(screen.getByLabelText(/^contraseña nueva$/i), password);
  await user.type(screen.getByLabelText(/confirmar contraseña/i), confirm);
  await user.click(
    screen.getByRole('button', { name: /restablecer contraseña/i }),
  );
}

describe('HU03 · Recuperar contraseña (elegir la contraseña nueva)', () => {
  it('HU03 E3: manda el token de la URL y la contraseña nueva, y confirma el cambio', async () => {
    const user = userEvent.setup();
    const fetchMock = resetResponds(() => new Response(null, { status: 204 }));
    renderWithProviders(<ResetPasswordScreen />, { route: ROUTE });

    await fillAndSubmit(user, 'clave-nueva-2027');

    expect(await screen.findByText('¡Listo!')).toBeInTheDocument();
    const calls = resetCalls(fetchMock);
    expect(calls).toHaveLength(1);
    expect(JSON.parse(String(calls[0]?.[1]?.body))).toEqual({
      token: TOKEN,
      password: 'clave-nueva-2027',
    });
  });

  it('tras el éxito, "Iniciar sesión" lleva al login', async () => {
    const user = userEvent.setup();
    resetResponds(() => new Response(null, { status: 204 }));
    renderWithProviders(<ResetPasswordScreen />, { route: ROUTE });
    await fillAndSubmit(user, 'clave-nueva-2027');
    await screen.findByText('¡Listo!');

    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('el token no se guarda en ningún almacenamiento', async () => {
    const user = userEvent.setup();
    resetResponds(() => new Response(null, { status: 204 }));
    renderWithProviders(<ResetPasswordScreen />, { route: ROUTE });
    await fillAndSubmit(user, 'clave-nueva-2027');
    await screen.findByText('¡Listo!');

    expect(JSON.stringify({ ...localStorage })).not.toContain(TOKEN);
    expect(JSON.stringify({ ...sessionStorage })).not.toContain(TOKEN);
  });

  it.each([
    ['corta1', 'La contraseña debe tener de 8 a 72 caracteres'],
    [
      'solo-letras-sin-numero',
      'La contraseña debe tener al menos una letra y un número',
    ],
    ['1234567890', 'La contraseña debe tener al menos una letra y un número'],
  ])(
    'rechaza la contraseña %j con las mismas reglas del registro y no llama a la API',
    async (password, message) => {
      const user = userEvent.setup();
      const fetchMock = resetResponds(
        () => new Response(null, { status: 204 }),
      );
      renderWithProviders(<ResetPasswordScreen />, { route: ROUTE });

      await fillAndSubmit(user, password);

      expect(screen.getByText(message)).toBeInTheDocument();
      expect(resetCalls(fetchMock)).toHaveLength(0);
    },
  );

  it('rechaza cuando las contraseñas no coinciden', async () => {
    const user = userEvent.setup();
    const fetchMock = resetResponds(() => new Response(null, { status: 204 }));
    renderWithProviders(<ResetPasswordScreen />, { route: ROUTE });

    await fillAndSubmit(user, 'clave-nueva-2027', 'clave-otra-2028');

    expect(
      screen.getByText(/las contraseñas no coinciden/i),
    ).toBeInTheDocument();
    expect(resetCalls(fetchMock)).toHaveLength(0);
  });

  it('un enlace vencido o ya usado muestra el aviso y ofrece pedir otro', async () => {
    const user = userEvent.setup();
    resetResponds(() =>
      json(400, {
        statusCode: 400,
        code: 'RESET_TOKEN_INVALID',
        message: 'crudo',
      }),
    );
    renderWithProviders(<ResetPasswordScreen />, { route: ROUTE });

    await fillAndSubmit(user, 'clave-nueva-2027');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El enlace venció o ya se usó. Pide uno nuevo.',
    );
    expect(screen.queryByText(/crudo/)).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /pedir un enlace nuevo/i }),
    );
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/forgot-password',
    );
  });

  it('sin token en la URL muestra el enlace no válido y no pide contraseña', () => {
    renderWithProviders(<ResetPasswordScreen />, { route: '/reset-password' });

    expect(screen.getByText(/enlace no válido/i)).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/^contraseña nueva$/i),
    ).not.toBeInTheDocument();
  });

  it('un error de red se muestra en español y deja intentar de nuevo', async () => {
    const user = userEvent.setup();
    resetResponds(() => {
      throw new TypeError('Failed to fetch');
    });
    renderWithProviders(<ResetPasswordScreen />, { route: ROUTE });

    await fillAndSubmit(user, 'clave-nueva-2027');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No hay conexión con Cafeta. Intenta de nuevo.',
    );
    expect(
      screen.getByRole('button', { name: /restablecer contraseña/i }),
    ).toBeEnabled();
  });

  it('el botón del ojo muestra y oculta las dos contraseñas', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResetPasswordScreen />, { route: ROUTE });
    const password = screen.getByLabelText(/^contraseña nueva$/i);
    const confirm = screen.getByLabelText(/confirmar contraseña/i);
    expect(password).toHaveAttribute('type', 'password');

    await user.click(
      screen.getByRole('button', { name: /mostrar contraseña/i }),
    );

    expect(password).toHaveAttribute('type', 'text');
    expect(confirm).toHaveAttribute('type', 'text');
  });
});
