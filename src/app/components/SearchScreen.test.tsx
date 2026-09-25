import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchScreen } from './SearchScreen';
import { FeedScreen } from './FeedScreen';
import { renderWithProviders } from '../../test/utils';

const type = async (user: ReturnType<typeof userEvent.setup>, text: string) => {
  await user.clear(screen.getByRole('textbox', { name: /buscar/i }));
  await user.type(screen.getByRole('textbox', { name: /buscar/i }), text);
};

describe('DEF-07 · HU41 — Buscar usuarios', () => {
  it('Escenario 1 — el nombre de un usuario existente muestra su perfil', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await type(user, 'maria');

    expect(screen.getByText('María Rodríguez')).toBeInTheDocument();
    expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();
  });

  it('Escenario 1 — encuentra igual sin tildes y por carrera', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await type(user, 'perez');
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();

    await type(user, 'ing. software');
    expect(screen.getByText('Laura Batista')).toBeInTheDocument();
  });

  it('Escenario 2 — sin coincidencias, avisa que no hay resultados', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await type(user, 'zzzzz');

    expect(screen.getByText(/no encontramos personas/i)).toBeInTheDocument();
  });

  it('se puede seguir a alguien desde los resultados, sin salir de la búsqueda', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await type(user, 'maria');
    await user.click(screen.getByRole('button', { name: /seguir a maría/i }));

    expect(
      screen.getByRole('button', { name: /dejar de seguir a maría/i }),
    ).toBeInTheDocument();
  });
});

describe('DEF-07 · HU42 — Buscar contenido', () => {
  it('Escenario 1 — una palabra clave muestra las publicaciones relacionadas', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await user.click(screen.getByRole('tab', { name: /publicaciones/i }));
    await type(user, 'calculo');

    expect(screen.getByTestId('post-p2')).toBeInTheDocument();
    expect(screen.queryByTestId('post-p1')).not.toBeInTheDocument();
  });

  it('Escenario 2 — sin coincidencias, avisa que no hay resultados', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await user.click(screen.getByRole('tab', { name: /publicaciones/i }));
    await type(user, 'zzzzz');

    expect(
      screen.getByText(/no encontramos publicaciones/i),
    ).toBeInTheDocument();
  });
});

describe('DEF-07 — Comportamiento de la pantalla de búsqueda', () => {
  it('cada pestaña lleva su conteo, para no perder resultados de la otra', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchScreen />, { route: '/search' });

    await type(user, 'laura'); // usuaria Laura Batista + su publicación de grupo

    expect(
      screen.getByRole('tab', { name: /personas \(1\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /publicaciones \(1\)/i }),
    ).toBeInTheDocument();
  });

  it('sin consulta ofrece sugerencias del propio directorio en vez de un vacío', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchScreen />, { route: '/search' });

    expect(screen.queryByText(/no encontramos/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Medicina' }));

    expect(screen.getByText('María Rodríguez')).toBeInTheDocument();
  });

  it('el feed ofrece la entrada a la búsqueda global', () => {
    renderWithProviders(<FeedScreen />, { route: '/home' });

    expect(screen.getByRole('link', { name: /buscar/i })).toHaveAttribute(
      'href',
      '/search',
    );
  });
});
