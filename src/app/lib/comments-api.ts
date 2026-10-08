/**
 * Llamadas de comentarios en publicaciones (spec 0009, decisión 21) y en
 * historias (decisión 24): las mismas cuatro rutas bajo `/posts/:id/comments` y
 * `/stories/:id/comments`. Los tipos salen del contrato OpenAPI generado en
 * api-types.ts, nunca escritos a mano.
 */
import type { components } from './api-types';
import { apiRequest } from './http';
import { toQueryString } from './posts-api';

type Schemas = components['schemas'];
export type CommentView = Schemas['CommentViewDto'];
export type CommentPage = Schemas['CommentPageDto'];

/** Largo máximo de un comentario; la API cuenta puntos de código. */
export const COMMENT_MAX = 500;

/** Qué se comenta: una publicación o una historia. */
export interface CommentTarget {
  kind: 'posts' | 'stories';
  id: string;
}

const base = ({ kind, id }: CommentTarget) => `/${kind}/${id}/comments`;

export const commentsApi = {
  /** Del más antiguo al más nuevo, 20 por página. */
  list: (target: CommentTarget, cursor: string | null) =>
    apiRequest<CommentPage>(`${base(target)}${toQueryString({ cursor })}`),
  create: ({ target, content }: { target: CommentTarget; content: string }) =>
    apiRequest<CommentView>(base(target), {
      method: 'POST',
      body: { content },
    }),
  edit: ({
    target,
    commentId,
    content,
  }: {
    target: CommentTarget;
    commentId: string;
    content: string;
  }) =>
    apiRequest<CommentView>(`${base(target)}/${commentId}`, {
      method: 'PATCH',
      body: { content },
    }),
  deactivate: ({
    target,
    commentId,
  }: {
    target: CommentTarget;
    commentId: string;
  }) =>
    apiRequest<void>(`${base(target)}/${commentId}/deactivate`, {
      method: 'POST',
    }),
};
