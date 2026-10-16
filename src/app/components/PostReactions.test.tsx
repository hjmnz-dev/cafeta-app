import { describe, it, expect } from 'vitest';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedScreen } from './FeedScreen';
import { Toaster } from './ui/sonner';
import { renderWithProviders } from '../../test/utils';
import { page, postView, signIn } from '../../test/api';
import { json } from '../../test/setup';
import type { ReactionType } from '../lib/reactions';

// HU28 · Reaccionar a publicaciones (spec 0009, decisión 20) en el feed real,
// contra una API simulada que lleva la cuenta como lo hace la verdadera.
interface Call {
  method: string;
  path: string;
  body: unknown;
}

interface FakeApi {
  calls: Call[];
  /** Resuelve la respuesta pendiente de la reacción (si se pidió retenerla). */
  release: () => void;
}

function fakeApi({
  mine = null,
  count = 4,
  failWith,
  hold = false,
}: {
  mine?: ReactionType | null;
  count?: number;
  failWith?: { status: number; code: string };
  hold?: boolean;
} = {}): FakeApi {
  const calls: Call[] = [];
  let current = mine;
  let total = count;
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
          reactionCount: total,
          myReaction: current,
        }),
      ]);
    }
    if (!url.pathname.endsWith('/posts/p1/reaction')) return undefined;
    calls.push({
      method,
      path: url.pathname.replace(/^.*\/api\/v1/, ''),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    if (hold) await gate;
    if (failWith) {
      return json(failWith.status, {
        statusCode: failWith.status,
        code: failWith.code,
      });
    }
    const next =
      method === 'PUT'
        ? (JSON.parse(String(init?.body)) as { type: ReactionType }).type
        : null;
    total += Number(next !== null) - Number(current !== null);
    current = next;
    return json(200, { reactionCount: total, myReaction: current });
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

const openPicker = async (
  user: ReturnType<typeof userEvent.setup>,
  card: ReturnType<typeof within>,
) => {
  await user.click(card.getByRole('button', { name: 'Más reacciones' }));
  return within(card.getByRole('group', { name: 'Elegir reacción' }));
};

describe('HU28 — Reaccionar a una publicación', () => {
  it('«Más reacciones» ofrece las cinco expresiones (teclado y escritorio)', async () => {
    const user = userEvent.setup();
    fakeApi();
    const card = await renderFeed();

    const picker = await openPicker(user, card);

    expect(
      picker.getAllByRole('button').map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Me encanta', 'Fuego', 'Aplauso', 'Risa', 'Asombro']);
  });

  it('HU28 E1: reaccionar manda PUT con el tipo y suma uno al conteo', async () => {
    const user = userEvent.setup();
    const api = fakeApi({ count: 4 });
    const card = await renderFeed();

    const picker = await openPicker(user, card);
    await user.click(picker.getByRole('button', { name: 'Fuego' }));

    expect(
      await card.findByRole('button', {
        name: 'Quitar tu reacción: Fuego. 5 reacciones',
      }),
    ).toBeInTheDocument();
    expect(api.calls).toEqual([
      { method: 'PUT', path: '/posts/p1/reaction', body: { type: 'FIRE' } },
    ]);
    expect(card.queryByRole('group', { name: 'Elegir reacción' })).toBeNull();
  });

  it('se ve al instante, antes de que la API responda', async () => {
    const user = userEvent.setup();
    const api = fakeApi({ count: 4, hold: true });
    const card = await renderFeed();

    const picker = await openPicker(user, card);
    await user.click(picker.getByRole('button', { name: 'Aplauso' }));

    expect(
      card.getByRole('button', {
        name: 'Quitar tu reacción: Aplauso. 5 reacciones',
      }),
    ).toBeInTheDocument();
    api.release();
    await waitFor(() => expect(api.calls).toHaveLength(1));
  });

  it('HU28 E2: repetir la misma reacción la quita con DELETE y baja el conteo', async () => {
    const user = userEvent.setup();
    const api = fakeApi({ mine: 'HEART', count: 4 });
    const card = await renderFeed();

    const picker = await openPicker(user, card);
    expect(picker.getByRole('button', { name: 'Me encanta' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(picker.getByRole('button', { name: 'Me encanta' }));

    expect(
      await card.findByRole('button', { name: 'Me encanta. 3 reacciones' }),
    ).toBeInTheDocument();
    expect(api.calls).toEqual([
      { method: 'DELETE', path: '/posts/p1/reaction', body: undefined },
    ]);
  });

  it('cambiar de expresión reemplaza la mía sin sumar al conteo', async () => {
    const user = userEvent.setup();
    const api = fakeApi({ mine: 'HEART', count: 4 });
    const card = await renderFeed();

    const picker = await openPicker(user, card);
    await user.click(picker.getByRole('button', { name: 'Asombro' }));

    expect(
      await card.findByRole('button', {
        name: 'Quitar tu reacción: Asombro. 4 reacciones',
      }),
    ).toBeInTheDocument();
    expect(api.calls).toEqual([
      { method: 'PUT', path: '/posts/p1/reaction', body: { type: 'WOW' } },
    ]);
  });

  it('si la API falla vuelve atrás y avisa con un mensaje del código', async () => {
    const user = userEvent.setup();
    fakeApi({
      count: 4,
      failWith: { status: 404, code: 'POST_NOT_FOUND' },
    });
    const card = await renderFeed();

    const picker = await openPicker(user, card);
    await user.click(picker.getByRole('button', { name: 'Risa' }));

    expect(
      await screen.findByText('Esa publicación ya no existe.'),
    ).toBeInTheDocument();
    expect(
      card.getByRole('button', { name: 'Me encanta. 4 reacciones' }),
    ).toBeInTheDocument();
  });

  it('Escape cierra el selector sin reaccionar', async () => {
    const user = userEvent.setup();
    const api = fakeApi();
    const card = await renderFeed();

    await openPicker(user, card);
    await user.keyboard('{Escape}');

    expect(card.queryByRole('group', { name: 'Elegir reacción' })).toBeNull();
    expect(api.calls).toEqual([]);
  });

  it('bug 1026: un toque corto pone ❤️ directo, sin abrir el selector', async () => {
    const user = userEvent.setup();
    const api = fakeApi({ count: 4 });
    const card = await renderFeed();

    await user.click(
      card.getByRole('button', { name: 'Me encanta. 4 reacciones' }),
    );

    expect(
      await card.findByRole('button', {
        name: 'Quitar tu reacción: Me encanta. 5 reacciones',
      }),
    ).toBeInTheDocument();
    expect(card.queryByRole('group', { name: 'Elegir reacción' })).toBeNull();
    expect(api.calls).toEqual([
      { method: 'PUT', path: '/posts/p1/reaction', body: { type: 'HEART' } },
    ]);
  });

  it('bug 1026: con una reacción puesta, el toque corto la quita', async () => {
    const user = userEvent.setup();
    const api = fakeApi({ mine: 'FIRE', count: 4 });
    const card = await renderFeed();

    await user.click(
      card.getByRole('button', {
        name: 'Quitar tu reacción: Fuego. 4 reacciones',
      }),
    );

    expect(
      await card.findByRole('button', { name: 'Me encanta. 3 reacciones' }),
    ).toBeInTheDocument();
    expect(api.calls).toEqual([
      { method: 'DELETE', path: '/posts/p1/reaction', body: undefined },
    ]);
  });

  it('bug 1026: mantener pulsado abre el selector y no reacciona', async () => {
    const api = fakeApi({ count: 4 });
    const card = await renderFeed();
    const heart = card.getByRole('button', {
      name: 'Me encanta. 4 reacciones',
    });

    fireEvent.pointerDown(heart);
    await act(() => new Promise((r) => setTimeout(r, 500)));
    fireEvent.pointerUp(heart);
    fireEvent.click(heart);

    expect(
      card.getByRole('group', { name: 'Elegir reacción' }),
    ).toBeInTheDocument();
    expect(api.calls).toEqual([]);
  });
});
