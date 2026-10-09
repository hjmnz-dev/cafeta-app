import { describe, it, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedScreen } from './FeedScreen';
import { ProfileScreen } from './ProfileScreen';
import { SavedPostsScreen } from './SavedPostsScreen';
import { Toaster } from './ui/sonner';
import { renderRoutes, renderWithProviders } from '../../test/utils';
import { page, postView, signIn, TEST_USER } from '../../test/api';
import { json } from '../../test/setup';

// HU25 · Guardar publicaciones (spec 0009, decisión 19) contra una API
// simulada que lleva la marca como lo hace la verdadera.
interface Call {
  method: string;
  path: string;
}

function fakeApi({
  saved = false,
  authorId,
  failWith,
  hold = false,
}: {
  saved?: boolean;
  authorId?: string;
  failWith?: { status: number; code: string };
  hold?: boolean;
} = {}) {
  const calls: Call[] = [];
  let current = saved;
  let release = () => undefined as void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  signIn(async (url, init) => {
    const method = init?.method ?? 'GET';
    if (url.pathname.endsWith('/posts/feed')) {
      return page([
        postView({
          id: 'p1',
          content: 'Examen de física',
          savedByMe: current,
          author: authorId ? { id: authorId } : undefined,
        }),
      ]);
    }
    if (!url.pathname.endsWith('/posts/p1/save')) return undefined;
    calls.push({ method, path: url.pathname.replace(/^.*\/api\/v1/, '') });
    if (hold) await gate;
    if (failWith) {
      return json(failWith.status, {
        statusCode: failWith.status,
        code: failWith.code,
      });
    }
    current = method === 'PUT';
    return new Response(null, { status: 204 });
  });
  return { calls, release };
}

const renderFeed = async () => {
  renderWithProviders(
    <>
      <FeedScreen />
      <Toaster />
    </>,
    { route: '/home' },
  );
  const card = await screen.findByTestId('post-p1');
  return within(card);
};

describe('HU25 — Guardar una publicación desde la tarjeta', () => {
  it('guardar manda PUT y deja el marcador presionado', async () => {
    const user = userEvent.setup();
    const api = fakeApi();
    const card = await renderFeed();

    await user.click(card.getByRole('button', { name: 'Guardar publicación' }));

    const marker = await card.findByRole('button', {
      name: 'Quitar de guardados',
    });
    expect(marker).toHaveAttribute('aria-pressed', 'true');
    expect(api.calls).toEqual([{ method: 'PUT', path: '/posts/p1/save' }]);
  });

  it('una ya guardada llega marcada y quitarla manda DELETE', async () => {
    const user = userEvent.setup();
    const api = fakeApi({ saved: true });
    const card = await renderFeed();

    const marker = card.getByRole('button', { name: 'Quitar de guardados' });
    expect(marker).toHaveAttribute('aria-pressed', 'true');
    await user.click(marker);

    expect(
      await card.findByRole('button', { name: 'Guardar publicación' }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(api.calls).toEqual([{ method: 'DELETE', path: '/posts/p1/save' }]);
  });

  it('se ve al instante, antes de que la API responda', async () => {
    const user = userEvent.setup();
    const api = fakeApi({ hold: true });
    const card = await renderFeed();

    await user.click(card.getByRole('button', { name: 'Guardar publicación' }));

    expect(
      card.getByRole('button', { name: 'Quitar de guardados' }),
    ).toBeDisabled();
    api.release();
    await waitFor(() => expect(api.calls).toHaveLength(1));
  });

  it('si la API falla vuelve atrás y avisa con un mensaje del código', async () => {
    const user = userEvent.setup();
    fakeApi({ failWith: { status: 404, code: 'POST_NOT_FOUND' } });
    const card = await renderFeed();

    await user.click(card.getByRole('button', { name: 'Guardar publicación' }));

    expect(
      await screen.findByText('Esa publicación ya no existe.'),
    ).toBeInTheDocument();
    expect(
      card.getByRole('button', { name: 'Guardar publicación' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('en mis propias publicaciones no hay marcador', async () => {
    fakeApi({ authorId: TEST_USER.id });
    const card = await renderFeed();

    expect(
      card.queryByRole('button', { name: /guardar publicación|guardados/i }),
    ).toBeNull();
  });
});

describe('HU25 — Mis publicaciones guardadas', () => {
  const renderSaved = () =>
    renderRoutes(
      [
        { path: '/profile/saved', element: <SavedPostsScreen /> },
        { path: '/profile', element: <p>Mi perfil</p> },
        { path: '/discover', element: <p>Explorar publicaciones</p> },
      ],
      { route: '/profile/saved' },
    );

  it('lista las guardadas con la misma tarjeta, ya marcadas', async () => {
    const fetchMock = signIn((url) =>
      url.pathname.endsWith('/me/saved')
        ? page([
            postView({
              id: 'g1',
              content: 'Primera guardada',
              savedByMe: true,
            }),
            postView({
              id: 'g2',
              content: 'Segunda guardada',
              savedByMe: true,
            }),
          ])
        : undefined,
    );
    renderSaved();

    expect(await screen.findByText('Primera guardada')).toBeInTheDocument();
    expect(screen.getByText('Segunda guardada')).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Quitar de guardados' }),
    ).toHaveLength(2);
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).includes('/me/saved'),
      ),
    ).toBe(true);
  });

  it('sin guardadas dice que está vacío y Explorar lleva a descubrir', async () => {
    const user = userEvent.setup();
    signIn((url) =>
      url.pathname.endsWith('/me/saved') ? page([]) : undefined,
    );
    renderSaved();

    expect(
      await screen.findByText('No tienes publicaciones guardadas'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Explorar' }));
    expect(
      await screen.findByText('Explorar publicaciones'),
    ).toBeInTheDocument();
  });

  it('si la API falla ofrece Reintentar y se recupera', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    signIn((url) => {
      if (!url.pathname.endsWith('/me/saved')) return undefined;
      attempts += 1;
      return attempts === 1
        ? json(500, { statusCode: 500, code: 'INTERNAL_ERROR' })
        : page([
            postView({ id: 'g1', content: 'Vuelve la lista', savedByMe: true }),
          ]);
    });
    renderSaved();

    await user.click(
      await screen.findByRole('button', { name: /reintentar/i }),
    );

    expect(await screen.findByText('Vuelve la lista')).toBeInTheDocument();
  });

  it('quitar una la saca de la lista tras confirmarse', async () => {
    const user = userEvent.setup();
    const calls: Call[] = [];
    let items = [
      postView({ id: 'g1', content: 'Para quitar', savedByMe: true }),
      postView({ id: 'g2', content: 'Se queda', savedByMe: true }),
    ];
    signIn((url, init) => {
      if (url.pathname.endsWith('/me/saved')) return page(items);
      const match = url.pathname.match(/\/posts\/(\w+)\/save$/);
      if (!match) return undefined;
      calls.push({
        method: init?.method ?? 'GET',
        path: url.pathname.replace(/^.*\/api\/v1/, ''),
      });
      items = items.filter((item) => item.id !== match[1]);
      return new Response(null, { status: 204 });
    });
    renderSaved();

    const card = within(await screen.findByTestId('post-g1'));
    await user.click(card.getByRole('button', { name: 'Quitar de guardados' }));

    await waitFor(() =>
      expect(screen.queryByText('Para quitar')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Se queda')).toBeInTheDocument();
    expect(calls).toEqual([{ method: 'DELETE', path: '/posts/g1/save' }]);
  });

  it('Volver regresa al perfil', async () => {
    const user = userEvent.setup();
    signIn((url) =>
      url.pathname.endsWith('/me/saved') ? page([]) : undefined,
    );
    renderSaved();

    await user.click(await screen.findByRole('button', { name: 'Volver' }));

    expect(await screen.findByText('Mi perfil')).toBeInTheDocument();
  });
});

describe('HU25 — La pestaña Guardados del perfil', () => {
  it('abre la pantalla de guardadas', async () => {
    const user = userEvent.setup();
    signIn();
    renderRoutes(
      [
        { path: '/profile', element: <ProfileScreen /> },
        { path: '/profile/saved', element: <p>Pantalla de guardadas</p> },
      ],
      { route: '/profile' },
    );

    await user.click(await screen.findByRole('button', { name: /guardados/i }));

    expect(
      await screen.findByText('Pantalla de guardadas'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/profile/saved');
  });
});
