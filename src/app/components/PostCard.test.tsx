import { describe, it, expect } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedScreen } from './FeedScreen';
import { ProfileScreen } from './ProfileScreen';
import { CreatePostScreen } from './CreatePostScreen';
import { renderRoutes, renderWithProviders } from '../../test/utils';

/**
 * DEF-09 · HU21/HU22/HU23 — Publicaciones: crear, editar, desactivar y eliminar,
 * siempre validando la autoría.
 *
 * Datos de partida (AppState): p1 y p5 son del usuario actual; p2 es de Juan Pérez.
 */

const feed = () => renderWithProviders(<FeedScreen filter="Todas" />, { route: '/home' });
const profile = () => renderWithProviders(<ProfileScreen />, { route: '/profile' });

const ownMenu = (postId: string) =>
  within(screen.getByTestId(`post-${postId}`)).getByRole('button', { name: /opciones de la publicación/i });

describe('DEF-09 · HU21 — Crear publicación', () => {
  it('la publicación creada aparece en el feed como propia', async () => {
    const user = userEvent.setup();
    renderRoutes(
      [
        { path: '/create-post', element: <CreatePostScreen /> },
        { path: '/home', element: <FeedScreen filter="Todas" /> },
      ],
      { route: '/create-post' },
    );

    await user.type(screen.getByPlaceholderText(/qué está pasando en intec/i), 'Llevo café para el grupo de estudio ☕');
    await user.click(screen.getByRole('button', { name: /^publicar$/i }));

    // Publicar es asíncrono (procesa las imágenes antes de guardar).
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/home'));

    const nueva = screen.getByText(/llevo café para el grupo de estudio/i).closest('[data-testid^="post-"]') as HTMLElement;
    expect(nueva).not.toBeNull();
    // Es propia: ofrece el menú de autor.
    expect(within(nueva).getByRole('button', { name: /opciones de la publicación de carlos gómez/i })).toBeInTheDocument();
  });

  it('no permite publicar sin contenido', () => {
    renderWithProviders(<CreatePostScreen />, { route: '/create-post' });
    expect(screen.getByRole('button', { name: /^publicar$/i })).toBeDisabled();
  });
});

describe('DEF-09 — Validación de autoría', () => {
  it('las publicaciones de terceros no ofrecen acciones de autor', async () => {
    const user = userEvent.setup();
    feed();

    // El menú existe en toda publicación, pero en las ajenas solo modera (FT11).
    await user.click(within(screen.getByTestId('post-p2')).getByRole('button', { name: /opciones/i }));

    expect(screen.queryByRole('button', { name: /^editar$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^desactivar$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^eliminar$/i })).toBeNull();
    expect(screen.getByRole('button', { name: /reportar publicación/i })).toBeInTheDocument();
  });

  it('las publicaciones propias ofrecen editar, desactivar y eliminar', async () => {
    const user = userEvent.setup();
    feed();

    await user.click(within(screen.getByTestId('post-p1')).getByRole('button', { name: /opciones/i }));

    expect(screen.getByRole('button', { name: /^editar$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^desactivar$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^eliminar$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reportar publicación/i })).toBeNull();
  });
});

describe('DEF-09 · HU22 — Editar publicación propia', () => {
  it('guarda el nuevo contenido, lo marca como editado y conserva las interacciones', async () => {
    const user = userEvent.setup();
    feed();

    await user.click(ownMenu('p1'));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));

    const textarea = screen.getByLabelText(/editar contenido de la publicación/i);
    await user.clear(textarea);
    await user.type(textarea, 'Cambio de hora: la charla de IA es a las 5:00 PM.');
    await user.click(within(screen.getByTestId('post-p1')).getByRole('button', { name: /^guardar$/i }));

    const card = within(screen.getByTestId('post-p1'));
    expect(card.getByText(/cambio de hora/i)).toBeInTheDocument();
    expect(card.getByText(/editado/i)).toBeInTheDocument();
    expect(card.getByLabelText(/me gusta/i)).toHaveTextContent('18'); // interacciones intactas
  });

  it('guardar sin cambios no la marca como editada', async () => {
    const user = userEvent.setup();
    feed();

    await user.click(ownMenu('p1'));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));
    await user.click(within(screen.getByTestId('post-p1')).getByRole('button', { name: /^guardar$/i }));

    expect(within(screen.getByTestId('post-p1')).queryByText(/editado/i)).toBeNull();
  });

  it('cancelar deja el contenido original', async () => {
    const user = userEvent.setup();
    feed();
    const original = screen.getByTestId('post-p1').textContent;

    await user.click(ownMenu('p1'));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));
    await user.type(screen.getByLabelText(/editar contenido/i), ' texto descartado');
    await user.click(screen.getByRole('button', { name: /^cancelar$/i }));

    expect(screen.getByTestId('post-p1').textContent).toBe(original);
  });

  it('la edición persiste al volver a montar la pantalla', async () => {
    const user = userEvent.setup();
    const { unmount } = feed();

    await user.click(ownMenu('p1'));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));
    await user.clear(screen.getByLabelText(/editar contenido/i));
    await user.type(screen.getByLabelText(/editar contenido/i), 'Contenido persistido');
    await user.click(within(screen.getByTestId('post-p1')).getByRole('button', { name: /^guardar$/i }));
    unmount();

    feed();
    expect(screen.getByText('Contenido persistido')).toBeInTheDocument();
  });
});

describe('DEF-09 · HU23 — Desactivar (baja lógica)', () => {
  it('la saca del feed pero el autor la sigue viendo marcada en su perfil', async () => {
    const user = userEvent.setup();
    const { unmount } = feed();

    await user.click(ownMenu('p1'));
    await user.click(screen.getByRole('button', { name: /^desactivar$/i }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^desactivar$/i }));

    expect(screen.queryByTestId('post-p1')).toBeNull();
    unmount();

    profile();
    expect(within(screen.getByTestId('post-p1')).getByText(/desactivada/i)).toBeInTheDocument();
  });

  it('cancelar en la confirmación no desactiva nada', async () => {
    const user = userEvent.setup();
    feed();

    await user.click(ownMenu('p1'));
    await user.click(screen.getByRole('button', { name: /^desactivar$/i }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^cancelar$/i }));

    expect(screen.getByTestId('post-p1')).toBeInTheDocument();
  });
});

describe('DEF-09 · HU23 — Eliminar (borrado permanente)', () => {
  it('la elimina de todas las vistas y no vuelve tras recargar', async () => {
    const user = userEvent.setup();
    const { unmount } = feed();

    await user.click(ownMenu('p1'));
    await user.click(screen.getByRole('button', { name: /^eliminar$/i }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^eliminar$/i }));

    expect(screen.queryByTestId('post-p1')).toBeNull();
    unmount();

    profile();
    expect(screen.queryByTestId('post-p1')).toBeNull();
  });
});

describe('DEF-09 — Perfil del autor', () => {
  it('lista solo las publicaciones propias y cuenta las activas', () => {
    profile();
    expect(screen.getByTestId('post-p1')).toBeInTheDocument();
    expect(screen.getByTestId('post-p5')).toBeInTheDocument();
    expect(screen.queryByTestId('post-p2')).toBeNull(); // de otro usuario
    expect(screen.getByTestId('stat-posts')).toHaveTextContent('2');
  });
});

describe('DEF-09 · HU23 — Reactivar una publicación desactivada', () => {
  it('vuelve a estar visible en el feed para todos', async () => {
    const user = userEvent.setup();
    const primero = feed();

    await user.click(ownMenu('p1'));
    await user.click(screen.getByRole('button', { name: /^desactivar$/i }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^desactivar$/i }));
    primero.unmount();

    // El autor la reactiva desde su perfil, sin confirmación (no es destructivo).
    const segundo = profile();
    await user.click(ownMenu('p1'));
    await user.click(screen.getByRole('button', { name: /^reactivar$/i }));
    expect(within(screen.getByTestId('post-p1')).queryByText(/desactivada/i)).toBeNull();
    segundo.unmount();

    feed();
    expect(screen.getByTestId('post-p1')).toBeInTheDocument();
  });

  it('una publicación activa no ofrece "Reactivar"', async () => {
    const user = userEvent.setup();
    feed();

    await user.click(ownMenu('p1'));
    expect(screen.getByRole('button', { name: /^desactivar$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^reactivar$/i })).toBeNull();
  });
});

describe('DEF-09 · HU21 — Imágenes de la publicación', () => {
  /** Siembra el estado persistido: evita depender de canvas para crear la imagen. */
  function seedConImagenes(images: string[]) {
    localStorage.setItem(
      'cafeta.appstate.v1',
      JSON.stringify({
        posts: [
          {
            id: 'img1', authorId: 'me', authorName: 'Carlos Gómez', authorAvatar: '',
            career: 'Ing. Software', time: 'ahora', type: 'text',
            content: 'Así quedó el laboratorio', likes: 0, comments: 0,
            active: true, edited: false, images,
          },
        ],
      }),
    );
  }

  it('las imágenes guardadas se muestran en el feed y sobreviven a la recarga', () => {
    seedConImagenes(['data:image/jpeg;base64,AAAA', 'data:image/jpeg;base64,BBBB']);
    feed();

    const card = within(screen.getByTestId('post-img1'));
    expect(card.getByAltText(/imagen 1 de la publicación/i)).toHaveAttribute('src', 'data:image/jpeg;base64,AAAA');
    expect(card.getByAltText(/imagen 2 de la publicación/i)).toBeInTheDocument();
  });

  it('editar el texto no pierde las imágenes', async () => {
    const user = userEvent.setup();
    seedConImagenes(['data:image/jpeg;base64,AAAA']);
    feed();

    await user.click(ownMenu('img1'));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));
    await user.clear(screen.getByLabelText(/editar contenido/i));
    await user.type(screen.getByLabelText(/editar contenido/i), 'Texto corregido');
    await user.click(within(screen.getByTestId('post-img1')).getByRole('button', { name: /^guardar$/i }));

    const card = within(screen.getByTestId('post-img1'));
    expect(card.getByText('Texto corregido')).toBeInTheDocument();
    expect(card.getByAltText(/imagen 1 de la publicación/i)).toBeInTheDocument();
  });
});
