import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfileScreen } from './UserProfileScreen';
import { PeopleScreen } from './PeopleScreen';
import { SettingsScreen } from './SettingsScreen';
import { FeedScreen } from './FeedScreen';
import { SearchScreen } from './SearchScreen';
import { renderRoutes, renderWithProviders } from '../../test/utils';

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
  it('HU53 — bloquear oculta el perfil y ofrece revertirlo', async () => {
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

  it('HU53 — bloquear a alguien a quien seguías corta el seguimiento', async () => {
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

  it('HU53 — el contenido del bloqueado desaparece del feed y de la búsqueda', async () => {
    const user = userEvent.setup();
    perfilYPantallas(
      'juan',
      <>
        <FeedScreen />
        <SearchScreen />
      </>,
    );

    expect(screen.getByTestId('post-p2')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /opciones sobre juan/i }),
    );
    await user.click(screen.getByRole('button', { name: /bloquear a juan/i }));

    expect(screen.queryByTestId('post-p2')).not.toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: /^buscar$/i }), 'juan');
    expect(
      screen.getByRole('tab', { name: /personas \(0\)/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /publicaciones \(0\)/i }),
    ).toBeInTheDocument();
  });

  it('HU53 — el bloqueado sale del directorio de Descubrir', async () => {
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

  it('HU54 — la cuenta bloqueada se puede recuperar desde Configuración', async () => {
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

describe('DEF-12 · HU55/HU56 — Reportar usuario y publicación', () => {
  it('HU55 — reportar a un usuario exige un motivo y queda registrado', async () => {
    const user = userEvent.setup();
    perfilDe('maria');

    await user.click(
      screen.getByRole('button', { name: /opciones sobre maría/i }),
    );
    await user.click(screen.getByRole('button', { name: /reportar usuario/i }));

    // Sin motivo seleccionado no se puede enviar.
    expect(
      screen.getByRole('button', { name: /enviar denuncia/i }),
    ).toBeDisabled();

    await user.click(screen.getByLabelText(/acoso o intimidación/i));
    await user.click(screen.getByRole('button', { name: /enviar denuncia/i }));

    // La denuncia no se puede repetir sobre el mismo objetivo.
    await user.click(
      screen.getByRole('button', { name: /opciones sobre maría/i }),
    );
    expect(
      screen.getByRole('button', { name: /usuario reportado/i }),
    ).toBeDisabled();
  });

  it('HU56 — reportar una publicación ajena queda registrado', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FeedScreen />, { route: '/home' });

    const card = screen.getByTestId('post-p2');
    await user.click(within(card).getByRole('button', { name: /opciones/i }));
    await user.click(
      screen.getByRole('button', { name: /reportar publicación/i }),
    );

    await user.click(screen.getByLabelText(/spam o publicidad/i));
    await user.click(screen.getByRole('button', { name: /enviar denuncia/i }));

    await user.click(within(card).getByRole('button', { name: /opciones/i }));
    expect(
      screen.getByRole('button', { name: /publicación reportada/i }),
    ).toBeDisabled();
  });
});
