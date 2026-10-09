import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArchivedPostsScreen } from './ArchivedPostsScreen';
import { ProfileScreen } from './ProfileScreen';
import { Toaster } from './ui/sonner';
import { renderWithProviders } from '../../test/utils';
import { page, postView, signIn, TEST_USER } from '../../test/api';
import { json } from '../../test/setup';

// Lista de mis archivadas y desactivadas (HU21; spec 0008, funcionalidad 18).
const archivedPath = (url: URL) => url.pathname.endsWith('/posts/archived');

const mineArchived = (id: string, content: string) =>
  postView({
    id,
    content,
    state: 'ARCHIVED',
    author: { id: TEST_USER.id },
  });

describe('HU21 — Pantalla de publicaciones archivadas', () => {
  it('lista mis archivadas y desactivadas, cada una con su estado', async () => {
    signIn((url) =>
      archivedPath(url)
        ? page([
            mineArchived('a1', 'Apuntes de cálculo'),
            postView({
              id: 'd1',
              content: 'Duda de física',
              state: 'DEACTIVATED',
              author: { id: TEST_USER.id },
            }),
          ])
        : undefined,
    );
    renderWithProviders(<ArchivedPostsScreen />, {
      route: '/profile/archived',
    });

    expect(await screen.findByText('Apuntes de cálculo')).toBeInTheDocument();
    expect(screen.getByText('Duda de física')).toBeInTheDocument();
    expect(screen.getByText('Archivada')).toBeInTheDocument();
    expect(screen.getByText('Desactivada')).toBeInTheDocument();
  });

  it('E2: Restaurar llama a /restore y vuelve a pedir la lista', async () => {
    const user = userEvent.setup();
    let restored = false;
    const calls: string[] = [];
    signIn((url, init) => {
      if (url.pathname.endsWith('/posts/a1/restore')) {
        calls.push(
          `${init?.method} ${url.pathname.replace(/^.*\/api\/v1/, '')}`,
        );
        restored = true;
        return new Response(null, { status: 204 });
      }
      if (!archivedPath(url)) return undefined;
      return restored
        ? page([])
        : page([mineArchived('a1', 'Apuntes de cálculo')]);
    });
    renderWithProviders(
      <>
        <ArchivedPostsScreen />
        <Toaster />
      </>,
      { route: '/profile/archived' },
    );

    await screen.findByText('Apuntes de cálculo');
    await user.click(
      screen.getByRole('button', { name: /opciones de la publicación/i }),
    );
    await user.click(screen.getByRole('button', { name: 'Restaurar' }));

    await waitFor(() => expect(calls).toEqual(['POST /posts/a1/restore']));
    expect(
      await screen.findByText('No tienes publicaciones archivadas'),
    ).toBeInTheDocument();
  });

  it('sin archivadas explica cómo archivar', async () => {
    signIn((url) => (archivedPath(url) ? page([]) : undefined));
    renderWithProviders(<ArchivedPostsScreen />, {
      route: '/profile/archived',
    });

    expect(
      await screen.findByText('No tienes publicaciones archivadas'),
    ).toBeInTheDocument();
  });

  it('si la API falla, deja reintentar', async () => {
    signIn((url) =>
      archivedPath(url)
        ? json(500, { statusCode: 500, message: 'x', code: 'INTERNAL_ERROR' })
        : undefined,
    );
    renderWithProviders(<ArchivedPostsScreen />, {
      route: '/profile/archived',
    });

    expect(
      await screen.findByRole('button', { name: 'Reintentar' }),
    ).toBeInTheDocument();
  });

  it('el perfil tiene el acceso a Archivadas', async () => {
    const user = userEvent.setup();
    signIn();
    renderWithProviders(<ProfileScreen />, { route: '/profile' });

    await user.click(
      screen.getByRole('button', { name: 'Publicaciones archivadas' }),
    );

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/profile/archived',
    );
  });
});
