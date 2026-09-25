import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileScreen } from './ProfileScreen';
import { EditProfileScreen } from './EditProfileScreen';
import { PeopleScreen } from './PeopleScreen';
import { CreateStoryScreen } from './CreateStoryScreen';
import { renderWithProviders, renderRoutes } from '../../test/utils';

describe('DEF-08 — La información del perfil refleja el estado real', () => {
  it('las cifras salen del estado: seguir a alguien mueve el contador "Siguiendo"', async () => {
    const user = userEvent.setup();
    // Ambas pantallas bajo el mismo estado, para ver el efecto de una en la otra.
    renderWithProviders(
      <>
        <PeopleScreen />
        <ProfileScreen />
      </>,
      { route: '/profile' },
    );

    expect(screen.getByTestId('stat-following')).toHaveTextContent('0');

    await user.click(screen.getByRole('button', { name: /^seguir a maría/i }));
    await user.click(screen.getByRole('button', { name: /^seguir a juan/i }));

    expect(screen.getByTestId('stat-following')).toHaveTextContent('2');
  });

  it('el contador de publicaciones cuenta solo las activas del usuario', () => {
    renderWithProviders(<ProfileScreen />, { route: '/profile' });

    // El feed de ejemplo trae dos publicaciones propias (p1 y p5), ambas activas.
    expect(screen.getByTestId('stat-posts')).toHaveTextContent('2');
  });

  it('la foto del perfil abre las historias propias y ofrece publicar otra', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <CreateStoryScreen />
        <ProfileScreen />
      </>,
      { route: '/create-story' },
    );

    // Sin historia propia, la foto lleva a crearla y no hay contador aparte.
    expect(screen.getByRole('link', { name: /crear historia/i })).toBeInTheDocument();
    expect(screen.queryByTestId('stat-stories')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /ver historia de/i })).not.toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: /texto de la historia/i }), 'Publicando una historia');
    await user.click(screen.getByRole('button', { name: /^publicar$/i }));

    // Ahora la misma foto abre la historia, y el "+" sigue llevando a publicar.
    expect(screen.getByRole('link', { name: /ver historia de carlos gómez/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /crear historia/i })).toHaveAttribute('href', '/create-story');
    // Una sola foto: la tira de historias ya no se repite abajo.
    expect(screen.queryByText('Tu historia')).not.toBeInTheDocument();
  });

  it('sin biografía se explica el vacío en lugar de dejar el hueco', async () => {
    const user = userEvent.setup();
    renderRoutes(
      [
        { path: '/profile/edit', element: <EditProfileScreen /> },
        { path: '/profile', element: <ProfileScreen /> },
      ],
      { route: '/profile/edit' },
    );

    // El campo no está asociado a su etiqueta, se localiza por su contenido.
    await user.clear(screen.getByDisplayValue(/desarrollo web/i));
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(screen.getByText(/aún no has escrito una biografía/i)).toBeInTheDocument();
  });

  it('las pestañas muestran contenido propio o un vacío explicado, no fotos de relleno', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfileScreen />, { route: '/profile' });

    await user.click(screen.getByRole('button', { name: /recursos/i }));
    expect(screen.getByText(/no has compartido recursos/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /guardados/i }));
    expect(screen.getByText(/no tienes publicaciones guardadas/i)).toBeInTheDocument();
  });
});
