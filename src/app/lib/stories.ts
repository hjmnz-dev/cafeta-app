/**
 * Reglas de las historias de la API (decisión 22): cola de reproducción y
 * tiempo restante. Sin red ni estado, para probarlas sin depender del reloj.
 */
import type { ReactionType } from './reactions';
import type {
  StoryAuthor,
  StoryGroup,
  StoryTray,
  StoryView,
} from './stories-api';

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

/** La historia con mi reacción `next` (null la quita). El conteo es del autor y no se toca. */
export function withStoryReaction(
  story: StoryView,
  next: ReactionType | null,
): StoryView {
  return { ...story, myReaction: next };
}

/** Aplica `change` a la historia `id` de la bandeja; el resto queda igual. */
export function mapStoryInTray(
  tray: StoryTray | undefined,
  id: string,
  change: (story: StoryView) => StoryView,
): StoryTray | undefined {
  if (!tray) return tray;
  return {
    ...tray,
    groups: tray.groups.map((group) => ({
      ...group,
      stories: group.stories.map((story) =>
        story.id === id ? change(story) : story,
      ),
    })),
  };
}

/** Bug 1068 · La historia ya abierta por mí: su anillo pasa a gris. */
export function withStorySeen(story: StoryView): StoryView {
  return { ...story, seenByMe: true };
}

/** Bug 1068 · Ya vi todas las historias vigentes de este autor. */
export function groupSeen(group: StoryGroup): boolean {
  return group.stories.every((story) => story.seenByMe);
}

/** La primera del autor que todavía no vi; si ya las vi todas, la primera. */
export function firstToWatch(group: StoryGroup): StoryView | undefined {
  return group.stories.find((story) => !story.seenByMe) ?? group.stories[0];
}

/** El fondo del anillo: el degradado de marca, o gris si ya está todo visto. */
export function ringBackground(seen: boolean): string {
  return seen ? 'var(--story-ring-seen)' : 'var(--story-ring)';
}
