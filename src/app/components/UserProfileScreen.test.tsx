import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfileScreen } from './UserProfileScreen';
import { PeopleScreen } from './PeopleScreen';
import { renderRoutes, renderWithProviders } from '../../test/utils';

function renderUser(userId: string) {
  return renderRoutes(
    [{ path: '/u/:userId', element: <UserProfileScreen /> }],
    { route: `/u/${userId}` },
  );
}

describe('DEF-05 · HU26/HU27 — Seguir / dejar de seguir', () => {
  it('HU26 — seguir a un perfil público registra la relación y suma un seguidor', async () => {
    const user = userEvent.setup();
    renderUser('maria'); // pública, 842 seguidores

    expect(
      within(screen.getByTestId('follower-count')).getByText('842'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^seguir$/i }));

    expect(
      screen.getByRole('button', { name: /siguiendo/i }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('follower-count')).getByText('843'),
    ).toBeInTheDocument();
  });

  it('HU27 — dejar de seguir elimina la relación y descuenta el seguidor', async () => {
    const user = userEvent.setup();
    renderUser('maria');

    await user.click(screen.getByRole('button', { name: /^seguir$/i }));
    await user.click(screen.getByRole('button', { name: /siguiendo/i }));

    expect(
      screen.getByRole('button', { name: /^seguir$/i }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('follower-count')).getByText('842'),
    ).toBeInTheDocument();
  });

  it('HU26 — seguir a un perfil privado crea una solicitud pendiente y no revela el contenido', async () => {
    const user = userEvent.setup();
    renderUser('laura'); // privada

    expect(screen.getByText(/esta cuenta es privada/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^seguir$/i }));

    expect(
      screen.getByRole('button', { name: /solicitado/i }),
    ).toBeInTheDocument();
    // Sigue oculto: una solicitud pendiente no es un seguimiento aprobado
    expect(screen.getByText(/esta cuenta es privada/i)).toBeInTheDocument();
  });

  it('el estado de seguimiento persiste al volver a montar la pantalla', async () => {
    const user = userEvent.setup();
    const { unmount } = renderUser('maria');
    await user.click(screen.getByRole('button', { name: /^seguir$/i }));
    unmount();

    renderUser('maria');
    expect(
      screen.getByRole('button', { name: /siguiendo/i }),
    ).toBeInTheDocument();
  });

  it('muestra un mensaje claro si el usuario no existe', () => {
    renderUser('inexistente');
    expect(screen.getByText(/usuario no encontrado/i)).toBeInTheDocument();
  });
});

describe('DEF-05 — Seguir desde el directorio (Descubrir)', () => {
  it('permite seguir en línea desde la lista de personas', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PeopleScreen />, { route: '/discover' });

    await user.click(
      screen.getByRole('button', { name: /seguir a María Rodríguez/i }),
    );
    expect(
      screen.getByRole('button', {
        name: /dejar de seguir a María Rodríguez/i,
      }),
    ).toBeInTheDocument();
  });

  it('el filtro de búsqueda por nombre acota la lista y maneja "sin resultados"', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PeopleScreen />, { route: '/discover' });

    await user.type(screen.getByPlaceholderText(/buscar personas/i), 'María');
    expect(screen.getByText('María Rodríguez')).toBeInTheDocument();
    expect(screen.queryByText('Pedro Sánchez')).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText(/buscar personas/i));
    await user.type(screen.getByPlaceholderText(/buscar personas/i), 'zzz');
    expect(screen.getByText(/no encontramos personas/i)).toBeInTheDocument();
  });
});
