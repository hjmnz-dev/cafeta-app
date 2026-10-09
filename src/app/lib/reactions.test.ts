import { describe, it, expect } from 'vitest';
import type { InfiniteData } from '@tanstack/react-query';
import { postView } from '../../test/api';
import type { PostPage } from './posts-api';
import {
  mapPostInPages,
  nextReaction,
  REACTIONS,
  withReaction,
  withServerState,
} from './reactions';

describe('nextReaction', () => {
  it('tocar la reacción que ya tengo la quita', () => {
    expect(nextReaction('FIRE', 'FIRE')).toBeNull();
  });

  it('tocar otra la pone o reemplaza', () => {
    expect(nextReaction(null, 'HEART')).toBe('HEART');
    expect(nextReaction('HEART', 'WOW')).toBe('WOW');
  });
});

describe('REACTIONS', () => {
  it('ofrece las cinco expresiones de la API, sin repetir', () => {
    expect(REACTIONS.map((r) => r.type)).toEqual([
      'HEART',
      'FIRE',
      'CLAP',
      'LAUGH',
      'WOW',
    ]);
  });
});

describe('withReaction', () => {
  it('reaccionar por primera vez suma uno', () => {
    const view = postView({ id: 'a', reactionCount: 4, myReaction: null });

    expect(withReaction(view, 'FIRE')).toMatchObject({
      myReaction: 'FIRE',
      reactionCount: 5,
    });
  });

  it('cambiar de tipo no suma', () => {
    const view = postView({ id: 'a', reactionCount: 4, myReaction: 'HEART' });

    expect(withReaction(view, 'WOW')).toMatchObject({
      myReaction: 'WOW',
      reactionCount: 4,
    });
  });

  it('quitarla resta uno y nunca baja de cero', () => {
    const view = postView({ id: 'a', reactionCount: 1, myReaction: 'CLAP' });

    expect(withReaction(view, null)).toMatchObject({
      myReaction: null,
      reactionCount: 0,
    });
    const stale = postView({ id: 'a', reactionCount: 0, myReaction: 'CLAP' });
    expect(withReaction(stale, null).reactionCount).toBe(0);
  });

  it('no modifica la publicación recibida', () => {
    const view = postView({ id: 'a', reactionCount: 4, myReaction: null });

    withReaction(view, 'FIRE');

    expect(view).toMatchObject({ myReaction: null, reactionCount: 4 });
  });

  it('volver al tipo anterior deshace el cambio', () => {
    const view = postView({ id: 'a', reactionCount: 4, myReaction: 'LAUGH' });

    const undone = withReaction(withReaction(view, null), 'LAUGH');

    expect(undone).toEqual(view);
  });
});

describe('withServerState', () => {
  it('toma el conteo y la reacción de la respuesta', () => {
    const view = postView({ id: 'a', reactionCount: 9, myReaction: null });

    expect(
      withServerState(view, { reactionCount: 2, myReaction: 'HEART' }),
    ).toMatchObject({ reactionCount: 2, myReaction: 'HEART' });
  });
});

describe('mapPostInPages', () => {
  const data: InfiniteData<PostPage, string | null> = {
    pageParams: [null],
    pages: [
      {
        items: [postView({ id: 'a' }), postView({ id: 'b' })],
        nextCursor: 'b',
      },
      { items: [postView({ id: 'c' })], nextCursor: null },
    ],
  };

  it('cambia solo la publicación pedida, en la página donde esté', () => {
    const next = mapPostInPages(data, 'c', (v) => withReaction(v, 'FIRE'));

    expect(next?.pages[1].items[0].myReaction).toBe('FIRE');
    expect(next?.pages[0].items.every((v) => v.myReaction === null)).toBe(true);
    expect(data.pages[1].items[0].myReaction).toBeNull();
  });

  it('sin datos devuelve undefined', () => {
    expect(mapPostInPages(undefined, 'a', (v) => v)).toBeUndefined();
  });
});
