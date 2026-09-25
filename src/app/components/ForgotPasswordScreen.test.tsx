import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';
import { renderWithProviders } from '../../test/utils';

/** Lee el código de demostración que la pantalla muestra en pantalla. */
function readDemoCode() {
  const el = screen.getByText(/código:/i);
  const match = el.textContent?.match(/(\d{6})/);
  if (!match) throw new Error('No se encontró el código de demo');
  return match[1];
}

describe('DEF-01 · HU03 — Recuperar contraseña', () => {
  it('rechaza un correo con formato inválido y no avanza', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordScreen />, {
      route: '/forgot-password',
    });

    await user.type(
      screen.getByPlaceholderText(/est\.intec\.edu\.do/i),
      'correo-invalido',
    );
    await user.click(screen.getByRole('button', { name: /enviar código/i }));

    expect(screen.getByText(/correo electrónico válido/i)).toBeInTheDocument();
    // Sigue en el paso de solicitud
    expect(
      screen.getByRole('button', { name: /enviar código/i }),
    ).toBeInTheDocument();
  });

  it('con un correo válido avanza al paso de verificación', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordScreen />, {
      route: '/forgot-password',
    });

    await user.type(
      screen.getByPlaceholderText(/est\.intec\.edu\.do/i),
      'juan@est.intec.edu.do',
    );
    await user.click(screen.getByRole('button', { name: /enviar código/i }));

    expect(screen.getByText(/verifica tu correo/i)).toBeInTheDocument();
    expect(screen.getByText(/juan@est\.intec\.edu\.do/i)).toBeInTheDocument();
  });

  it('rechaza un código incorrecto', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordScreen />, {
      route: '/forgot-password',
    });

    await user.type(
      screen.getByPlaceholderText(/est\.intec\.edu\.do/i),
      'juan@est.intec.edu.do',
    );
    await user.click(screen.getByRole('button', { name: /enviar código/i }));

    await user.type(screen.getByLabelText(/código de verificación/i), '000000');
    await user.click(screen.getByRole('button', { name: /verificar/i }));

    expect(screen.getByText(/el código no es correcto/i)).toBeInTheDocument();
  });

  it('completa el flujo feliz: correo → código → nueva contraseña → éxito', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordScreen />, {
      route: '/forgot-password',
    });

    // Paso 1
    await user.type(
      screen.getByPlaceholderText(/est\.intec\.edu\.do/i),
      'juan@est.intec.edu.do',
    );
    await user.click(screen.getByRole('button', { name: /enviar código/i }));

    // Paso 2 — usa el código válido que muestra la demo
    const code = readDemoCode();
    await user.type(screen.getByLabelText(/código de verificación/i), code);
    await user.click(screen.getByRole('button', { name: /verificar/i }));

    // Paso 3
    expect(screen.getByText(/nueva contraseña/i)).toBeInTheDocument();
    await user.type(
      screen.getByLabelText(/^nueva contraseña$/i),
      'nuevaClave123',
    );
    await user.type(
      screen.getByLabelText(/confirmar nueva contraseña/i),
      'nuevaClave123',
    );
    await user.click(
      screen.getByRole('button', { name: /restablecer contraseña/i }),
    );

    // Éxito
    expect(screen.getByText('¡Listo!')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });

  it('rechaza cuando las contraseñas no coinciden', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForgotPasswordScreen />, {
      route: '/forgot-password',
    });

    await user.type(
      screen.getByPlaceholderText(/est\.intec\.edu\.do/i),
      'juan@est.intec.edu.do',
    );
    await user.click(screen.getByRole('button', { name: /enviar código/i }));
    const code = readDemoCode();
    await user.type(screen.getByLabelText(/código de verificación/i), code);
    await user.click(screen.getByRole('button', { name: /verificar/i }));

    await user.type(
      screen.getByLabelText(/^nueva contraseña$/i),
      'claveUno123',
    );
    await user.type(
      screen.getByLabelText(/confirmar nueva contraseña/i),
      'claveDos456',
    );
    await user.click(
      screen.getByRole('button', { name: /restablecer contraseña/i }),
    );

    expect(
      screen.getByText(/las contraseñas no coinciden/i),
    ).toBeInTheDocument();
  });

  it('el código expira: tras la vigencia no permite verificar', () => {
    vi.useFakeTimers();
    try {
      renderWithProviders(<ForgotPasswordScreen />, {
        route: '/forgot-password',
      });

      fireEvent.change(screen.getByPlaceholderText(/est\.intec\.edu\.do/i), {
        target: { value: 'juan@est.intec.edu.do' },
      });
      fireEvent.click(screen.getByRole('button', { name: /enviar código/i }));

      const code = readDemoCode();
      fireEvent.change(screen.getByLabelText(/código de verificación/i), {
        target: { value: code },
      });

      // Avanza más allá de la vigencia (60s)
      act(() => {
        vi.advanceTimersByTime(61000);
      });

      expect(screen.getByText(/código expirado/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /verificar/i }));
      expect(screen.getByText(/el código expiró/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
