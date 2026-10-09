import { describe, it, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
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
  await user.click(
    card.getByRole('button', { name: /^(reaccionar|tu reacción)/i }),
  );
  return within(card.getByRole('group', { name: 'Elegir reacción' }));
};

describe('HU28 — Reaccionar a una publicación', () => {
  it('tocar el botón ofrece las cinco expresiones', async () => {
    const user = userEvent.setup();
    fakeApi();
    const card = await renderFeed();

    const picker = await openPicker(user, card);

    expect(
      picker.getAllByRole('button').map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Me encanta', 'Fuego', 'Aplauso', 'Risa', 'Asombro']);
  });

  it('reaccionar manda PUT con el tipo y suma uno al conteo', async () => {
    const user = userEvent.setup();
    const api = fakeApi({ count: 4 });
    const card = await renderFeed();

    const picker = await openPicker(user, card);
    await user.click(picker.getByRole('button', { name: 'Fuego' }));

    expect(
      await card.findByRole('button', {
        name: 'Tu reacción: Fuego. 5 reacciones',
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
      card.getByRole('button', { name: 'Tu reacción: Aplauso. 5 reacciones' }),
    ).toBeInTheDocument();
    api.release();
    await waitFor(() => expect(api.calls).toHaveLength(1));
  });

  it('repetir la misma reacción la quita con DELETE y baja el conteo', async () => {
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
      await card.findByRole('button', { name: 'Reaccionar. 3 reacciones' }),
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
        name: 'Tu reacción: Asombro. 4 reacciones',
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
      card.getByRole('button', { name: 'Reaccionar. 4 reacciones' }),
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
});
