/**
 * Lógica pura de las reacciones a publicaciones (spec 0009, decisión 20): las
 * cinco expresiones, qué pasa al tocar una y cómo se ajusta una publicación en
 * pantalla antes de que la API responda.
 */
import type { InfiniteData } from '@tanstack/react-query';
import type { components } from './api-types';
import type { PostPage, PostView } from './posts-api';

export type ReactionType = components['schemas']['ReactionType'];
export type ReactionState = components['schemas']['ReactionStateDto'];

export interface ReactionOption {
  type: ReactionType;
  emoji: string;
  label: string;
}

/** En el orden en que se ofrecen; el primero es la reacción "Me encanta". */
export const REACTIONS: readonly ReactionOption[] = [
  { type: 'HEART', emoji: '❤️', label: 'Me encanta' },
  { type: 'FIRE', emoji: '🔥', label: 'Fuego' },
  { type: 'CLAP', emoji: '👏', label: 'Aplauso' },
  { type: 'LAUGH', emoji: '😂', label: 'Risa' },
  { type: 'WOW', emoji: '😮', label: 'Asombro' },
];

export function optionOf(type: ReactionType): ReactionOption {
  return REACTIONS.find((r) => r.type === type) ?? REACTIONS[0];
}

/**
 * Qué mandar a la API al tocar `tapped`: tocar la reacción que ya tengo la
 * quita (null) y cualquier otra la pone o reemplaza.
 */
export function nextReaction(
  current: ReactionType | null,
  tapped: ReactionType,
): ReactionType | null {
  return current === tapped ? null : tapped;
}

/** La publicación como queda con mi reacción `next`; el conteo nunca baja de 0. */
export function withReaction(
  view: PostView,
  next: ReactionType | null,
): PostView {
  const delta = Number(next !== null) - Number(view.myReaction !== null);
  return {
    ...view,
    myReaction: next,
    reactionCount: Math.max(0, view.reactionCount + delta),
  };
}

/** La publicación con lo que respondió la API, que manda sobre lo supuesto. */
export function withServerState(
  view: PostView,
  state: ReactionState,
): PostView {
  return {
    ...view,
    myReaction: state.myReaction,
    reactionCount: state.reactionCount,
  };
}

/** Aplica `change` a la publicación `id` en cada página; el resto queda igual. */
export function mapPostInPages(
  data: InfiniteData<PostPage> | undefined,
  id: string,
  change: (view: PostView) => PostView,
): InfiniteData<PostPage> | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((view) => (view.id === id ? change(view) : view)),
    })),
  };
}
