/**
 * Lógica pura de publicaciones (spec 0005): convierte la vista de la API en
 * el `Post` que ya dibuja <PostCard />, calcula el tiempo relativo, ordena las
 * pestañas de carrera y cuenta caracteres igual que la base.
 */
import type { Career } from './auth-api';
import type { PostView } from './posts-api';
import type { Post, PostType } from '../store/AppState';

export const POST_CONTENT_MAX = 2000;

const CARD_TYPES: Readonly<Record<PostView['type'], PostType>> = {
  TEXT: 'text',
  STUDY_NOTES: 'study-notes',
  PDF: 'pdf',
  EVENT: 'event',
  CODE: 'code',
  STUDY_GROUP: 'study-group',
  // La marca de anuncio la pone la tarjeta; el cuerpo se dibuja como texto.
  ANNOUNCEMENT: 'text',
};

const MONTHS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "ahora", "5m", "2h", "3d" y, desde 7 días, "12 sep". */
export function relativeTime(iso: string, now: Date): string {
  const date = new Date(iso);
  const elapsed = now.getTime() - date.getTime();
  if (elapsed < MINUTE) return 'ahora';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d`;
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

const EVENT_DATE = new Intl.DateTimeFormat('es-DO', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

export function toCardPost(view: PostView, now: Date): Post {
  return {
    id: view.id,
    authorId: view.author.id,
    authorName: view.author.displayName,
    authorAvatar: '',
    career: view.author.careerName ?? '',
    time: relativeTime(view.createdAt, now),
    type: CARD_TYPES[view.type],
    content: view.content ?? '',
    likes: view.reactionCount,
    comments: view.commentCount,
    active: true,
    edited: view.editedAt !== null,
    eventDate: view.eventStartsAt
      ? EVENT_DATE.format(new Date(view.eventStartsAt))
      : undefined,
    eventLocation: view.eventLocation ?? undefined,
    codeSnippet: view.codeSnippet ?? undefined,
    groupName: view.groupName ?? undefined,
    spotsAvailable: view.groupSpots ?? undefined,
    location: view.location ?? undefined,
    images: view.media.filter((m) => m.mediaType === 'IMAGE').map((m) => m.url),
    videoUrl: view.media.find((m) => m.mediaType === 'VIDEO')?.url,
    documentUrl: view.media.find((m) => m.mediaType === 'DOCUMENT')?.url,
  };
}

const byName = (a: Career, b: Career) =>
  a.name.localeCompare(b.name, 'es') || a.id.localeCompare(b.id);

/** Mi carrera primero y el resto en orden alfabético; sin carrera, todas en orden. */
export function orderCareerTabs(
  careers: readonly Career[],
  myCareerId: string | null,
): Career[] {
  const mine = careers.find((c) => c.id === myCareerId);
  // filter ya devuelve una copia: ordenarla no toca la lista recibida.
  const rest = careers.filter((c) => c !== mine).sort(byName);
  return mine ? [mine, ...rest] : rest;
}

/** Puntos de código, igual que cuenta varchar en PostgreSQL (y la API). */
export function countChars(text: string): number {
  return [...text].length;
}
