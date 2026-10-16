import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostCard } from './PostCard';
import { renderWithProviders } from '../../test/utils';
import { postView, signIn } from '../../test/api';
import { json } from '../../test/setup';
import { toCardPost } from '../lib/posts';

/**
 * La tarjeta de una publicación de la API. Las acciones de autor (editar,
 * desactivar, eliminar, archivar) se prueban contra la API simulada en
 * LivePostCard.test.tsx.
 */

const NOW = new Date('2026-09-26T12:00:00Z');

/** Una publicación ajena con `images` adjuntas, como la manda la API. */
function withImages(images: string[]) {
  const view = postView({
    id: 'img1',
    content: 'Así quedó el laboratorio',
    media: images.map((url) => ({
      url,
      mediaType: 'IMAGE' as const,
      mimeType: 'image/jpeg',
    })),
  });
  return renderWithProviders(
    <PostCard
      post={toCardPost(view, NOW)}
      live={{
        isMine: false,
        authorId: 'u-2',
        isAnnouncement: false,
        reaction: { mine: null, busy: false, select: () => undefined },
      }}
    />,
  );
}

describe('HU21 — Imágenes de la publicación', () => {
  it('muestra cada imagen adjunta', () => {
    withImages(['https://blob.test/a.jpg', 'https://blob.test/b.jpg']);

    const card = within(screen.getByTestId('post-img1'));
    expect(card.getByAltText('Imagen 1 de la publicación')).toHaveAttribute(
      'src',
      'https://blob.test/a.jpg',
    );
    expect(card.getByAltText('Imagen 2 de la publicación')).toBeInTheDocument();
  });

  it('bug 1025: tocar una imagen la abre ampliada y se puede pasar a las demás', async () => {
    const user = userEvent.setup();
    withImages([
      'https://blob.test/a.jpg',
      'https://blob.test/b.jpg',
      'https://blob.test/c.jpg',
    ]);

    await user.click(
      screen.getByRole('button', {
        name: 'Ampliar imagen 2 de la publicación',
      }),
    );
    const viewer = within(
      screen.getByRole('dialog', { name: 'Imagen 2 de 3' }),
    );
    expect(viewer.getByRole('img')).toHaveAttribute(
      'src',
      'https://blob.test/b.jpg',
    );

    await user.click(viewer.getByRole('button', { name: 'Imagen siguiente' }));
    expect(
      screen.getByRole('dialog', { name: 'Imagen 3 de 3' }),
    ).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(
      screen.getByRole('dialog', { name: 'Imagen 1 de 3' }),
    ).toBeInTheDocument();
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Imagen anterior',
      }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Imagen 3 de 3' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cerrar imagen' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('bug 1025: con una sola imagen no hay flechas y Escape la cierra', async () => {
    const user = userEvent.setup();
    withImages(['https://blob.test/a.jpg']);

    await user.click(
      screen.getByRole('button', {
        name: 'Ampliar imagen 1 de la publicación',
      }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Imagen de la publicación' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Imagen siguiente' }),
    ).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Spec 0005 · AC-8 — Tarjeta de una publicación real (live)', () => {
  const now = NOW;
  const NO_REACTION = { mine: null, busy: false, select: () => undefined };

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
        live={{
          isMine: false,
          authorId: 'u-2',
          isAnnouncement: false,
          reaction: NO_REACTION,
        }}
      />,
    );

    const card = within(screen.getByTestId('post-e1'));
    // El nombre lleva a su perfil, que aplica su privacidad (decisión 15).
    expect(card.getByRole('link', { name: 'Juan Pérez' })).toHaveAttribute(
      'href',
      '/u/u-2',
    );
    expect(card.getByText('Medicina')).toBeInTheDocument();
    expect(card.getByText(/2h/)).toHaveTextContent('Editado');
    expect(card.getByText('Auditorio')).toBeInTheDocument();
    expect(card.getByText('Laboratorio 3')).toBeInTheDocument();
    expect(
      card.getByRole('button', { name: 'Me encanta. 12 reacciones' }),
    ).toBeInTheDocument();
    expect(card.getByLabelText('3 comentarios')).toBeInTheDocument();
    // Sin backend todavía: ni guardar ni asistir. Quedan el menú de una publicación
    // ajena (solo ofrece reportar), comentar y reaccionar.
    expect(
      card.getAllByRole('button').map((b) => b.getAttribute('aria-label')),
    ).toEqual([
      'Opciones de la publicación de Juan Pérez',
      '3 comentarios',
      'Me encanta. 12 reacciones',
      'Más reacciones',
    ]);
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
        live={{
          isMine: false,
          authorId: 'u-2',
          isAnnouncement: false,
          reaction: NO_REACTION,
        }}
      />,
    );

    const card = within(screen.getByTestId('post-uno'));
    expect(
      card.getByRole('button', { name: 'Me encanta. 1 reacción' }),
    ).toBeInTheDocument();
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
        live={{
          isMine: true,
          authorId: 'u-1',
          isAnnouncement: true,
          reaction: NO_REACTION,
        }}
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

describe('Bugs 1043, 1047 y 1038 — avatar, anillo y comentarios de archivadas', () => {
  const live = {
    isMine: false,
    authorId: '01926f00-0000-7000-8000-0000000000aa',
    isAnnouncement: false,
    reaction: { mine: null, busy: false, select: () => undefined },
  };

  it('bug 1043: con foto de perfil, la publicación muestra la foto y no la inicial', () => {
    const view = postView({
      id: 'f1',
      author: { avatarUrl: 'https://blob.test/juan.jpg' },
    });
    renderWithProviders(<PostCard post={toCardPost(view, NOW)} live={live} />);

    expect(screen.getByAltText('Juan Pérez')).toHaveAttribute(
      'src',
      'https://blob.test/juan.jpg',
    );
  });

  it('bug 1047: si el autor tiene una historia vigente, su avatar lleva el anillo y la abre', async () => {
    signIn((url) =>
      url.pathname.endsWith('/stories')
        ? json(200, {
            groups: [
              {
                author: {
                  id: live.authorId,
                  handle: 'jperez',
                  displayName: 'Juan Pérez',
                  avatarUrl: null,
                },
                stories: [
                  {
                    id: 's1',
                    text: null,
                    editedAt: null,
                    myReaction: null,
                    reactionCount: null,
                    commentCount: 0,
                    createdAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
                    media: {
                      mediaType: 'IMAGE',
                      url: 'https://blob.test/s1.jpg',
                      mimeType: 'image/jpeg',
                    },
                  },
                ],
              },
            ],
          })
        : undefined,
    );
    renderWithProviders(
      <PostCard post={toCardPost(postView({ id: 'r1' }), NOW)} live={live} />,
    );

    expect(
      await screen.findByRole('link', { name: 'Ver historia de Juan Pérez' }),
    ).toHaveAttribute('href', '/stories/s1');
  });

  it('bug 1038: en una archivada propia se leen los comentarios pero no se escribe', async () => {
    const user = userEvent.setup();
    signIn((url) =>
      url.pathname.endsWith('/posts/a1/comments')
        ? json(200, {
            items: [
              {
                id: 'c1',
                content: 'Buen resumen',
                createdAt: new Date().toISOString(),
                editedAt: null,
                isMine: false,
                author: {
                  id: '01926f00-0000-7000-8000-0000000000b1',
                  handle: 'beto',
                  displayName: 'Beto',
                  avatarUrl: null,
                },
              },
            ],
            nextCursor: null,
          })
        : undefined,
    );
    renderWithProviders(
      <PostCard
        post={toCardPost(postView({ id: 'a1', commentCount: 1 }), NOW)}
        live={{ ...live, isMine: true, state: 'ARCHIVED' }}
      />,
    );

    await user.click(screen.getByRole('button', { name: '1 comentario' }));

    expect(await screen.findByText('Buen resumen')).toBeInTheDocument();
    expect(screen.getByText(/está archivada/)).toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: 'Escribe un comentario' }),
    ).not.toBeInTheDocument();
  });
});
