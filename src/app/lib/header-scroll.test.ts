import { describe, it, expect } from 'vitest';
import {
  headerAfterScroll,
  HEADER_SETTLE_MS,
  INITIAL_HEADER_SCROLL,
  type HeaderScroll,
} from './header-scroll';

/** Recorre posiciones de scroll a 20 ms entre sí y devuelve cada estado. */
function run(ys: number[], start: HeaderScroll = INITIAL_HEADER_SCROLL) {
  let state = start;
  return ys.map((y, i) => {
    state = headerAfterScroll(state, y, 1000 + i * 20);
    return state.shown;
  });
}

describe('headerAfterScroll (bug 1053)', () => {
  it('bajando de a poco se recoge una sola vez', () => {
    const shown = run(Array.from({ length: 40 }, (_, i) => 20 + i * 6));
    const changes = shown.filter((v, i) => i > 0 && v !== shown[i - 1]);
    expect(changes).toEqual([false]);
    expect(shown.at(-1)).toBe(false);
  });

  it('el salto hacia atrás al recogerse no la vuelve a mostrar', () => {
    // Baja, se recoge, y el navegador "corrige" 52 px hacia atrás enseguida.
    const shown = run([20, 40, 60, 80, 28, 30, 34]);
    expect(shown.slice(3)).toEqual([false, false, false, false]);
  });

  it('subir de verdad (más que el umbral, tras la pausa) la muestra', () => {
    let state = headerAfterScroll(INITIAL_HEADER_SCROLL, 300, 0);
    state = headerAfterScroll(state, 340, 10);
    expect(state.shown).toBe(false);
    state = headerAfterScroll(state, 330, 10 + HEADER_SETTLE_MS + 1);
    expect(state.shown).toBe(false);
    state = headerAfterScroll(state, 300, 10 + HEADER_SETTLE_MS + 40);
    expect(state.shown).toBe(true);
  });

  it('cerca del principio siempre se ve', () => {
    const hidden: HeaderScroll = { shown: false, anchor: 400, settledAt: 0 };
    expect(headerAfterScroll(hidden, 5, 1000).shown).toBe(true);
  });
});
