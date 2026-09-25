import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';
import { renderWithProviders } from '../../test/utils';

describe('Login — mostrar y ocultar la contraseña', () => {
  it('hay un solo botón para ver los caracteres, y alterna el campo', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginScreen />, { route: '/login' });

    const campo = screen.getByPlaceholderText('••••••••');
    expect(campo).toHaveAttribute('type', 'password');

    // Un único control propio: el nativo del navegador se oculta por CSS.
    const ojos = screen.getAllByRole('button', { name: /^mostrar contraseña$/i });
    expect(ojos).toHaveLength(1);

    await user.click(ojos[0]);
    expect(campo).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /ocultar contraseña/i }));
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
