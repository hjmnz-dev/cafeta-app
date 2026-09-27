import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostCard } from './PostCard';
import { AppStatePosts, renderWithProviders } from '../../test/utils';
import { postView } from '../../test/api';
import { toCardPost } from '../lib/posts';

/**
 * DEF-09 · HU22/HU23 — La tarjeta sin `live`: editar, desactivar y eliminar,
 * siempre validando la autoría. Es el modo que siguen usando las pantallas
 * que aún leen AppState; el feed y el perfil ya usan `live` (spec 0005).
 *
 * Datos de partida (AppState): p1 y p5 son del usuario actual; p2 es de Juan Pérez.
 */

const cards = () => renderWithProviders(<AppStatePosts />);

const ownMenu = (postId: string) =>
  within(screen.getByTestId(`post-${postId}`)).getByRole('button', {
    name: /opciones de la publicación/i,
  });

describe('DEF-09 — Validación de autoría', () => {
  it('las publicaciones de terceros no ofrecen acciones de autor', async () => {
    const user = userEvent.setup();
    cards();

    // El menú existe en toda publicación, pero en las ajenas solo modera (FT11).
    await user.click(
      within(screen.getByTestId('post-p2')).getByRole('button', {
        name: /opciones/i,
      }),
    );

    expect(screen.queryByRole('button', { name: /^editar$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^desactivar$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^eliminar$/i })).toBeNull();
    expect(
      screen.getByRole('button', { name: /reportar publicación/i }),
    ).toBeInTheDocument();
  });

  it('las publicaciones propias ofrecen editar, desactivar y eliminar', async () => {
    const user = userEvent.setup();
    cards();

    await user.click(ownMenu('p1'));

    expect(
      screen.getByRole('button', { name: /^editar$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^desactivar$/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^eliminar$/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /reportar publicación/i }),
    ).toBeNull();
  });
});

describe('DEF-09 · HU22 — Editar publicación propia', () => {
  it('guarda el nuevo contenido, lo marca como editado y conserva las interacciones', async () => {
    const user = userEvent.setup();
    cards();

    await user.click(ownMenu('p1'));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));

    const textarea = screen.getByLabelText(
      /editar contenido de la publicación/i,
    );
    await user.clear(textarea);
    await user.type(
      textarea,
      'Cambio de hora: la charla de IA es a las 5:00 PM.',
    );
    await user.click(
      within(screen.getByTestId('post-p1')).getByRole('button', {
        name: /^guardar$/i,
      }),
    );

    const card = within(screen.getByTestId('post-p1'));
    expect(card.getByText(/cambio de hora/i)).toBeInTheDocument();
    expect(card.getByText(/editado/i)).toBeInTheDocument();
    expect(card.getByLabelText(/me gusta/i)).toHaveTextContent('18'); // interacciones intactas
  });

  it('guardar sin cambios no la marca como editada', async () => {
    const user = userEvent.setup();
    cards();

    await user.click(ownMenu('p1'));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));
    await user.click(
      within(screen.getByTestId('post-p1')).getByRole('button', {
        name: /^guardar$/i,
      }),
    );

    expect(
      within(screen.getByTestId('post-p1')).queryByText(/editado/i),
    ).toBeNull();
  });

  it('cancelar deja el contenido original', async () => {
    const user = userEvent.setup();
    cards();
    const original = screen.getByTestId('post-p1').textContent;

    await user.click(ownMenu('p1'));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));
    await user.type(
      screen.getByLabelText(/editar contenido/i),
      ' texto descartado',
    );
    await user.click(screen.getByRole('button', { name: /^cancelar$/i }));

    expect(screen.getByTestId('post-p1').textContent).toBe(original);
  });

  it('la edición persiste al volver a montar', async () => {
    const user = userEvent.setup();
    const { unmount } = cards();

    await user.click(ownMenu('p1'));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));
    await user.clear(screen.getByLabelText(/editar contenido/i));
    await user.type(
      screen.getByLabelText(/editar contenido/i),
      'Contenido persistido',
    );
    await user.click(
      within(screen.getByTestId('post-p1')).getByRole('button', {
        name: /^guardar$/i,
      }),
    );
    unmount();

    cards();
    expect(screen.getByText('Contenido persistido')).toBeInTheDocument();
  });
});

describe('DEF-09 · HU23 — Desactivar, reactivar y eliminar', () => {
  it('desactivar la marca como tal y reactivar le quita la marca', async () => {
    const user = userEvent.setup();
    cards();

    await user.click(ownMenu('p1'));
    await user.click(screen.getByRole('button', { name: /^desactivar$/i }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /^desactivar$/i,
      }),
    );
    expect(
      within(screen.getByTestId('post-p1')).getByText(/desactivada/i),
    ).toBeInTheDocument();

    // Reactivar no pide confirmación (no es destructivo).
    await user.click(ownMenu('p1'));
    await user.click(screen.getByRole('button', { name: /^reactivar$/i }));
    expect(
      within(screen.getByTestId('post-p1')).queryByText(/desactivada/i),
    ).toBeNull();
  });

  it('cancelar en la confirmación no desactiva nada', async () => {
    const user = userEvent.setup();
    cards();

    await user.click(ownMenu('p1'));
    await user.click(screen.getByRole('button', { name: /^desactivar$/i }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /^cancelar$/i,
      }),
    );

    expect(
      within(screen.getByTestId('post-p1')).queryByText(/desactivada/i),
    ).toBeNull();
  });

  it('una publicación activa no ofrece "Reactivar"', async () => {
    const user = userEvent.setup();
    cards();

    await user.click(ownMenu('p1'));
    expect(
      screen.getByRole('button', { name: /^desactivar$/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^reactivar$/i })).toBeNull();
  });

  it('eliminar la borra y no vuelve al montar de nuevo', async () => {
    const user = userEvent.setup();
    const { unmount } = cards();

    await user.click(ownMenu('p1'));
    await user.click(screen.getByRole('button', { name: /^eliminar$/i }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /^eliminar$/i,
      }),
    );

    expect(screen.queryByTestId('post-p1')).toBeNull();
    unmount();

    cards();
    expect(screen.queryByTestId('post-p1')).toBeNull();
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
            id: 'img1',
            authorId: 'me',
            authorName: 'Carlos Gómez',
            authorAvatar: '',
            career: 'Ing. Software',
            time: 'ahora',
            type: 'text',
            content: 'Así quedó el laboratorio',
            likes: 0,
            comments: 0,
            active: true,
            edited: false,
            images,
          },
        ],
      }),
    );
  }

  it('las imágenes guardadas se muestran y sobreviven a la recarga', () => {
    seedConImagenes([
      'data:image/jpeg;base64,AAAA',
      'data:image/jpeg;base64,BBBB',
    ]);
    cards();

    const card = within(screen.getByTestId('post-img1'));
    expect(card.getByAltText(/imagen 1 de la publicación/i)).toHaveAttribute(
      'src',
      'data:image/jpeg;base64,AAAA',
    );
    expect(
      card.getByAltText(/imagen 2 de la publicación/i),
    ).toBeInTheDocument();
  });

  it('editar el texto no pierde las imágenes', async () => {
    const user = userEvent.setup();
    seedConImagenes(['data:image/jpeg;base64,AAAA']);
    cards();

    await user.click(ownMenu('img1'));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));
    await user.clear(screen.getByLabelText(/editar contenido/i));
    await user.type(
      screen.getByLabelText(/editar contenido/i),
      'Texto corregido',
    );
    await user.click(
      within(screen.getByTestId('post-img1')).getByRole('button', {
        name: /^guardar$/i,
      }),
    );

    const card = within(screen.getByTestId('post-img1'));
    expect(card.getByText('Texto corregido')).toBeInTheDocument();
    expect(
      card.getByAltText(/imagen 1 de la publicación/i),
    ).toBeInTheDocument();
  });
});

describe('Spec 0005 · AC-8 — Tarjeta de una publicación real (live)', () => {
  const now = new Date('2026-09-26T12:00:00Z');

  it('muestra los datos reales y ningún botón sin backend', () => {
    const view = postView({
      id: 'e1',
      type: 'EVENT',
      content: 'Hackathon',
      location: 'Auditorio',
      editedAt: '2026-09-26T11:00:00Z',
      eventStartsAt: '2026-10-10T14:00:00Z',
      eventLocation: 'Laboratorio 3',
      reactionCount: 12,
      commentCount: 3,
      createdAt: '2026-09-26T10:00:00Z',
    });
    renderWithProviders(
      <PostCard
        post={toCardPost(view, now)}
        live={{ isMine: false, isAnnouncement: false }}
      />,
    );

    const card = within(screen.getByTestId('post-e1'));
    expect(card.getByText('Juan Pérez')).toBeInTheDocument();
    expect(card.queryByRole('link', { name: 'Juan Pérez' })).toBeNull();
    expect(card.getByText('Medicina')).toBeInTheDocument();
    expect(card.getByText(/2h/)).toHaveTextContent('Editado');
    expect(card.getByText('Auditorio')).toBeInTheDocument();
    expect(card.getByText('Laboratorio 3')).toBeInTheDocument();
    expect(card.getByLabelText('12 reacciones')).toBeInTheDocument();
    expect(card.getByLabelText('3 comentarios')).toBeInTheDocument();
    // Sin backend todavía: ni reaccionar, comentar, guardar, menú ni asistir.
    expect(card.queryAllByRole('button')).toHaveLength(0);
    // Sin foto: la inicial en un círculo.
    expect(card.getByRole('img', { name: 'Juan Pérez' })).toHaveTextContent(
      'J',
    );
  });

  it('con un solo conteo el lector de pantalla lo dice en singular', () => {
    const view = postView({ id: 'uno', reactionCount: 1, commentCount: 1 });
    renderWithProviders(
      <PostCard
        post={toCardPost(view, now)}
        live={{ isMine: false, isAnnouncement: false }}
      />,
    );

    const card = within(screen.getByTestId('post-uno'));
    expect(card.getByLabelText('1 reacción')).toBeInTheDocument();
    expect(card.getByLabelText('1 comentario')).toBeInTheDocument();
  });

  it('mi nombre lleva a mi perfil y un anuncio lleva su marca', () => {
    const view = postView({
      id: 'a1',
      type: 'ANNOUNCEMENT',
      author: { displayName: 'Cafeta INTEC', careerName: null },
    });
    renderWithProviders(
      <PostCard
        post={toCardPost(view, now)}
        live={{ isMine: true, isAnnouncement: true }}
      />,
    );

    const card = within(screen.getByTestId('post-a1'));
    expect(card.getByRole('link', { name: 'Cafeta INTEC' })).toHaveAttribute(
      'href',
      '/profile',
    );
    expect(card.getByText(/anuncio oficial/i)).toBeInTheDocument();
  });
});
