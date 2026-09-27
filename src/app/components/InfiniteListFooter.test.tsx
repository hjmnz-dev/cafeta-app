import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedScreen } from './FeedScreen';
import { renderWithProviders } from '../../test/utils';
import { page, postView, signIn } from '../../test/api';
import { json } from '../../test/setup';

// Scroll infinito (spec 0005, AC-5 y AC-9) con un IntersectionObserver
// simulado: jsdom no trae uno, y aquí se decide cuándo "asoma" el centinela.
type Callback = (entries: { isIntersecting: boolean }[]) => void;
const observers: { callback: Callback; root: Element | null }[] = [];

class FakeObserver {
  constructor(callback: Callback, options?: { root?: Element | null }) {
    observers.push({ callback, root: options?.root ?? null });
  }
  observe() {}
  disconnect() {}
}

/** Hace asomar el centinela en el observador más reciente. */
const reachEnd = () =>
  act(() => observers.at(-1)?.callback([{ isIntersecting: true }]));

const ids = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `p${from + i}`);

describe('Spec 0005 — Scroll infinito del feed', () => {
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal('IntersectionObserver', FakeObserver);
  });

  it('AC-5: al llegar al final pide la página siguiente con el cursor y deja de pedir sin nextCursor', async () => {
    const fetchMock = signIn((url) => {
      if (!url.pathname.endsWith('/posts/feed')) return undefined;
      return url.searchParams.get('cursor') === 'p20'
        ? page(ids(21, 25).map((id) => postView({ id })))
        : page(
            ids(1, 20).map((id) => postView({ id })),
            'p20',
          );
    });
    renderWithProviders(<FeedScreen />, { route: '/home' });

    expect(await screen.findByTestId('post-p20')).toBeInTheDocument();
    // Observa dentro del contenedor con scroll del feed, no de la ventana.
    expect(observers.at(-1)?.root).toHaveClass('overflow-y-auto');
    reachEnd();

    expect(await screen.findByTestId('post-p25')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(25);
    const cursors = fetchMock.mock.calls
      .map(([input]) => new URL(String(input)))
      .filter((u) => u.pathname.endsWith('/posts/feed'))
      .map((u) => u.searchParams.get('cursor'));
    expect(cursors).toEqual([null, 'p20']);

    const before = observers.length;
    reachEnd();
    expect(observers.length).toBe(before);
    expect(
      fetchMock.mock.calls.filter(([input]) =>
        String(input).includes('/posts/feed'),
      ),
    ).toHaveLength(2);
  });

  it('AC-9: si falla la página siguiente, avisa al final sin borrar lo cargado y "Reintentar" la pide de nuevo', async () => {
    const user = userEvent.setup();
    let failNext = true;
    signIn((url) => {
      if (!url.pathname.endsWith('/posts/feed')) return undefined;
      if (url.searchParams.get('cursor') !== 'p20') {
        return page(
          ids(1, 20).map((id) => postView({ id })),
          'p20',
        );
      }
      return failNext
        ? json(503, { statusCode: 503, code: 'UNAVAILABLE' })
        : page([postView({ id: 'p21' })]);
    });
    renderWithProviders(<FeedScreen />, { route: '/home' });

    expect(await screen.findByTestId('post-p20')).toBeInTheDocument();
    reachEnd();

    expect(
      await screen.findByText('Algo salió mal. Intenta de nuevo.'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(20);

    failNext = false;
    await user.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findByTestId('post-p21')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(21);
  });
});
