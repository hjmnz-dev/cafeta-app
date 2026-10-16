/**
 * Bug 1053 · Cuándo se recoge y cuándo vuelve la cabecera del feed al hacer
 * scroll. Antes cada pocos píxeles decidía de nuevo, y al recogerse (52 px
 * menos de alto) el navegador corregía el scroll hacia atrás: eso se leía como
 * "subir", la cabecera volvía y el ciclo se repetía, parpadeando.
 *
 * Ahora la dirección se mide desde un ancla (el punto donde cambió por última
 * vez), hace falta moverse `HEADER_THRESHOLD` píxeles para cambiar, y durante
 * `HEADER_SETTLE_MS` después de un cambio no se decide nada: lo que se mueva
 * en ese rato es la propia cabecera acomodándose.
 */

export const HEADER_THRESHOLD = 24;
export const HEADER_SETTLE_MS = 350;
/** Cerca del principio la cabecera siempre se ve. */
export const HEADER_TOP_ZONE = 10;

export interface HeaderScroll {
  shown: boolean;
  /** Desde dónde se mide el próximo cambio de dirección. */
  anchor: number;
  /** Hasta cuándo se ignora el scroll (ms, reloj de `now`). */
  settledAt: number;
}

export const INITIAL_HEADER_SCROLL: HeaderScroll = {
  shown: true,
  anchor: 0,
  settledAt: 0,
};

export function headerAfterScroll(
  state: HeaderScroll,
  y: number,
  now: number,
): HeaderScroll {
  if (y <= HEADER_TOP_ZONE) {
    return state.shown
      ? { ...state, anchor: y }
      : { shown: true, anchor: y, settledAt: now + HEADER_SETTLE_MS };
  }
  if (now < state.settledAt) return { ...state, anchor: y };
  if (state.shown) {
    if (y > state.anchor + HEADER_THRESHOLD) {
      return { shown: false, anchor: y, settledAt: now + HEADER_SETTLE_MS };
    }
    // Mientras sube (o casi no se mueve) el ancla sigue al punto más alto.
    return { ...state, anchor: Math.min(state.anchor, y) };
  }
  if (y < state.anchor - HEADER_THRESHOLD) {
    return { shown: true, anchor: y, settledAt: now + HEADER_SETTLE_MS };
  }
  // Mientras baja el ancla sigue al punto más bajo.
  return { ...state, anchor: Math.max(state.anchor, y) };
}
