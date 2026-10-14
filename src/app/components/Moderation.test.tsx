import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfileScreen } from './UserProfileScreen';
import { PeopleScreen } from './PeopleScreen';
import { SettingsScreen } from './SettingsScreen';
import { SearchScreen } from './SearchScreen';
import { renderRoutes } from '../../test/utils';

const perfilDe = (id: string) =>
  renderRoutes([{ path: '/u/:userId', element: <UserProfileScreen /> }], {
    route: `/u/${id}`,
  });

/**
 * Monta el perfil junto a otras pantallas bajo el mismo estado, para ver cómo
 * un bloqueo hecho en el perfil afecta al resto de la app. La ruta lleva
 * parámetro porque el perfil lo necesita para saber a quién muestra.
 */
const perfilYPantallas = (id: string, extra: React.ReactElement) =>
  renderRoutes(
    [
      {
        path: '/u/:userId',
        element: (
          <>
            <UserProfileScreen />
            {extra}
          </>
        ),
      },
    ],
    { route: `/u/${id}` },
  );

describe('DEF-12 · HU53/HU54 — Bloquear y desbloquear usuario', () => {
  it('HU53 E1: bloquear oculta el perfil y ofrece revertirlo', async () => {
    const user = userEvent.setup();
    perfilDe('maria');

    await user.click(
      screen.getByRole('button', { name: /opciones sobre maría/i }),
    );
    await user.click(screen.getByRole('button', { name: /bloquear a maría/i }));

    expect(
      screen.getByText(/bloqueaste a maría rodríguez/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/estudiante de medicina/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^desbloquear$/i }),
    ).toBeInTheDocument();
  });

  it('HU53 E1: bloquear a alguien a quien seguías corta el seguimiento', async () => {
    const user = userEvent.setup();
    perfilDe('maria');

    await user.click(screen.getByRole('button', { name: /^seguir$/i }));
    expect(
      screen.getByRole('button', { name: /siguiendo/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /opciones sobre maría/i }),
    );
    await user.click(screen.getByRole('button', { name: /bloquear a maría/i }));
    await user.click(screen.getByRole('button', { name: /^desbloquear$/i }));

    // Al desbloquear no se restaura la relación anterior: hay que volver a seguir.
    expect(
      screen.getByRole('button', { name: /^seguir$/i }),
    ).toBeInTheDocument();
  });

  // El feed ya viene de la API (spec 0005); ocultar a los bloqueados en él
  // llega con la funcionalidad 29. Aquí queda la búsqueda, que sigue en AppState.
  it('HU53 E1: el contenido del bloqueado desaparece de la búsqueda', async () => {
    const user = userEvent.setup();
    perfilYPantallas('juan', <SearchScreen />);

    await user.click(
      screen.getByRole('button', { name: /opciones sobre juan/i }),
    );
    await user.click(screen.getByRole('button', { name: /bloquear a juan/i }));

    await user.type(screen.getByRole('textbox', { name: /^buscar$/i }), 'juan');
    expect(
      screen.getByRole('tab', { name: /personas \(0\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /publicaciones \(0\)/i }),
    ).toBeInTheDocument();
  });

  it('HU53 E1: el bloqueado sale del directorio de Descubrir', async () => {
    const user = userEvent.setup();
    perfilYPantallas('pedro', <PeopleScreen />);

    // La fila del directorio se identifica por su botón de seguir con nombre.
    expect(
      screen.getByRole('button', { name: /seguir a pedro sánchez/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /opciones sobre pedro/i }),
    );
    await user.click(screen.getByRole('button', { name: /bloquear a pedro/i }));

    expect(
      screen.queryByRole('button', { name: /seguir a pedro sánchez/i }),
    ).toBeNull();
  });

  it('HU54 E1: la cuenta bloqueada se puede recuperar desde Configuración', async () => {
    const user = userEvent.setup();
    perfilYPantallas(
      'pedro',
      <>
        <SettingsScreen />
        <PeopleScreen />
      </>,
    );

    await user.click(
      screen.getByRole('button', { name: /opciones sobre pedro/i }),
    );
    await user.click(screen.getByRole('button', { name: /bloquear a pedro/i }));

    expect(
      screen.queryByRole('button', { name: /seguir a pedro sánchez/i }),
    ).toBeNull();

    await user.click(
      screen.getByRole('button', { name: /desbloquear a pedro sánchez/i }),
    );

    // De vuelta en el directorio.
    expect(
      screen.getByRole('button', { name: /seguir a pedro sánchez/i }),
    ).toBeInTheDocument();
  });
});
