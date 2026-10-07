/**
 * Reglas de las historias de la API (decisión 22): cola de reproducción y
 * tiempo restante. Sin red ni estado, para probarlas sin depender del reloj.
 */
import type { StoryAuthor, StoryGroup, StoryView } from './stories-api';

/** Lo que dura una historia en pantalla antes de pasar sola a la siguiente. */
export const STORY_DURATION_MS = 10_000;

/** Máximo de caracteres del texto de una historia (lo valida la API). */
export const STORY_TEXT_MAX = 280;

/** Una historia con su autor: lo que recorre el visor. */
export interface QueueEntry {
  story: StoryView;
  author: StoryAuthor;
}

/**
 * Orden de reproducción: autor por autor, en el orden de la bandeja (el de la
 * historia más reciente primero), y dentro de cada autor en el orden en que
 * publicó, que es como llega de la API.
 */
export function playbackQueue(groups: readonly StoryGroup[]): QueueEntry[] {
  return groups.flatMap((group) =>
    group.stories.map((story) => ({ story, author: group.author })),
  );
}

/**
 * Historias de un mismo autor dentro de la cola. Es lo que mide la barra de
 * progreso: cuántas historias tiene *esta* persona, no cuántas hay en total.
 */
export function authorSegment(
  queue: readonly QueueEntry[],
  authorId: string,
): QueueEntry[] {
  return queue.filter((entry) => entry.author.id === authorId);
}

/** El grupo de un autor en la bandeja, o undefined si no tiene historias vigentes. */
export function groupOf(
  groups: readonly StoryGroup[],
  authorId: string | undefined,
): StoryGroup | undefined {
  return groups.find((group) => group.author.id === authorId);
}

/** Tiempo que le queda a una historia, en palabras: "Quedan 3 h", "Quedan 45 min". */
export function remainingLabel(
  expiresAt: string,
  now: number = Date.now(),
): string {
  const left = Date.parse(expiresAt) - now;
  if (left <= 0) return 'Vencida';
  const hours = Math.floor(left / (60 * 60 * 1000));
  if (hours >= 1) return `Quedan ${hours} h`;
  return `Quedan ${Math.max(1, Math.floor(left / (60 * 1000)))} min`;
}
