/**
 * Vigencia y visibilidad de las historias (DEF-04 · FT04).
 *
 * Lo que distingue una historia de una publicación es el tiempo: se muestra
 * mientras esté dentro de su ventana de 24 h y luego desaparece de la vista,
 * aunque su registro se conserve (HU13/HU15). Esa regla vive aquí, separada de
 * la UI, para poder probarla sin depender del reloj real.
 */
import type { Story, StoryComment } from '../store/AppState';

/** Ventana de vigencia de una historia: 24 h desde su publicación (HU13). */
export const STORY_TTL_MS = 24 * 60 * 60 * 1000;

/** Lo que dura una historia en pantalla antes de pasar sola a la siguiente. */
export const STORY_DURATION_MS = 10_000;

/** Emojis de reacción rápida ofrecidos al ver una historia (HU16). */
export const STORY_REACTIONS = ['❤️', '🔥', '👏', '😂', '😮'];

/** Una historia está vigente si sigue activa y no ha vencido su ventana. */
export function isVigente(story: Story, now: number = Date.now()): boolean {
  return story.active && now - story.createdAt < STORY_TTL_MS;
}

/** Tiempo que le queda a una historia, en palabras: "Quedan 3 h", "Quedan 45 min". */
export function remainingLabel(story: Story, now: number = Date.now()): string {
  const left = story.createdAt + STORY_TTL_MS - now;
  if (!story.active) return 'Desactivada';
  if (left <= 0) return 'Vencida';
  const hours = Math.floor(left / (60 * 60 * 1000));
  if (hours >= 1) return `Quedan ${hours} h`;
  return `Quedan ${Math.max(1, Math.floor(left / (60 * 1000)))} min`;
}

/**
 * Historias que el usuario puede ver (HU13): las propias y las de quienes
 * sigue, siempre vigentes. Se ordenan con la propia primero y el resto de más
 * reciente a más antigua, que es como se leen en la tira del feed.
 */
export function visibleStories(
  stories: Story[],
  {
    currentUserId,
    followingIds,
    now = Date.now(),
  }: { currentUserId: string; followingIds: string[]; now?: number },
): Story[] {
  return stories
    .filter((s) => isVigente(s, now))
    .filter(
      (s) => s.authorId === currentUserId || followingIds.includes(s.authorId),
    )
    .sort((a, b) => {
      const mine =
        Number(b.authorId === currentUserId) -
        Number(a.authorId === currentUserId);
      return mine !== 0 ? mine : b.createdAt - a.createdAt;
    });
}

/**
 * Orden de reproducción: se ven las historias autor por autor, y dentro de cada
 * autor de la más antigua a la más reciente, como se leería una secuencia.
 *
 * `visibleStories` ya decide *qué* se puede ver y en qué orden aparecen los
 * autores en la tira; esta función solo ordena la reproducción dentro de cada
 * uno, que es al revés (allí manda lo más reciente; aquí, lo primero publicado).
 */
export function playbackQueue(visibles: Story[]): Story[] {
  const order: string[] = [];
  const byAuthor = new Map<string, Story[]>();

  for (const story of visibles) {
    if (!byAuthor.has(story.authorId)) {
      byAuthor.set(story.authorId, []);
      order.push(story.authorId);
    }
    byAuthor.get(story.authorId)!.push(story);
  }

  return order.flatMap((authorId) =>
    [...byAuthor.get(authorId)!].sort((a, b) => a.createdAt - b.createdAt),
  );
}

/**
 * Historias de un mismo autor dentro de la cola. Es lo que mide la barra de
 * progreso: cuántas historias tiene *esta* persona, no cuántas hay en total.
 */
export function authorSegment(queue: Story[], authorId: string): Story[] {
  return queue.filter((s) => s.authorId === authorId);
}

/** Comentarios visibles de una historia: los desactivados se ocultan (HU19). */
export function visibleComments(story: Story): StoryComment[] {
  return story.comments.filter((c) => c.active);
}

/** Conteo de cada emoji para pintar el resumen de reacciones (HU16). */
export function reactionCounts(
  story: Story,
): { emoji: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const emoji of Object.values(story.reactions)) {
    counts.set(emoji, (counts.get(emoji) ?? 0) + 1);
  }
  return [...counts.entries()].map(([emoji, count]) => ({ emoji, count }));
}
