import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditProfileScreen } from './EditProfileScreen';
import { ProfileScreen } from './ProfileScreen';
import { renderWithProviders, renderRoutes } from '../../test/utils';

describe('DEF-02 · HU10 — Editar perfil', () => {
  it('carga los valores actuales del perfil', () => {
    renderWithProviders(<EditProfileScreen />, { route: '/profile/edit' });
    expect(screen.getByDisplayValue('Carlos Gómez')).toBeInTheDocument();
    expect(screen.getByDisplayValue('@cgomez_intec')).toBeInTheDocument();
  });

  it('no permite guardar con el nombre vacío', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EditProfileScreen />, { route: '/profile/edit' });

    await user.clear(screen.getByDisplayValue('Carlos Gómez'));
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(screen.getByText(/el nombre es requerido/i)).toBeInTheDocument();
    // No navegó fuera de la edición
    expect(screen.getByTestId('location')).toHaveTextContent('/profile/edit');
  });

  it('guarda los cambios y se reflejan en el perfil visible a terceros', async () => {
    const user = userEvent.setup();
    renderRoutes(
      [
        { path: '/profile/edit', element: <EditProfileScreen /> },
        { path: '/profile', element: <ProfileScreen /> },
      ],
      { route: '/profile/edit' },
    );

    const nameInput = screen.getByDisplayValue('Carlos Gómez');
    await user.clear(nameInput);
    await user.type(nameInput, 'Carlos M. Gómez');

    const bio = screen.getByDisplayValue(/desarrollo web/i);
    await user.clear(bio);
    await user.type(bio, 'Bio actualizada para la demo');

    await user.click(screen.getByRole('button', { name: /guardar/i }));

    // Navegó al perfil y muestra los datos nuevos
    expect(screen.getByTestId('location')).toHaveTextContent('/profile');
    expect(screen.getByRole('heading', { name: 'Carlos M. Gómez' })).toBeInTheDocument();
    expect(screen.getByText('Bio actualizada para la demo')).toBeInTheDocument();
  });

  it('permite agregar una etiqueta académica', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EditProfileScreen />, { route: '/profile/edit' });

    await user.type(screen.getByPlaceholderText(/agregar etiqueta/i), 'GraphQL');
    await user.click(screen.getByRole('button', { name: /agregar etiqueta/i }));

    expect(screen.getByText('GraphQL')).toBeInTheDocument();
  });
});
