/**
 * Llamadas de comentarios en publicaciones (spec 0009, decisión 21). Los tipos
 * salen del contrato OpenAPI generado en api-types.ts, nunca escritos a mano.
 * La 24 usa la misma forma para las historias.
 */
import type { components } from './api-types';
import { apiRequest } from './http';
import { toQueryString } from './posts-api';

type Schemas = components['schemas'];
export type CommentView = Schemas['CommentViewDto'];
export type CommentPage = Schemas['CommentPageDto'];

/** Largo máximo de un comentario; la API cuenta puntos de código. */
export const COMMENT_MAX = 500;

const base = (postId: string) => `/posts/${postId}/comments`;

export const postCommentsApi = {
  /** Del más antiguo al más nuevo, 20 por página. */
  list: (postId: string, cursor: string | null) =>
    apiRequest<CommentPage>(`${base(postId)}${toQueryString({ cursor })}`),
  create: ({ postId, content }: { postId: string; content: string }) =>
    apiRequest<CommentView>(base(postId), {
      method: 'POST',
      body: { content },
    }),
  edit: ({
    postId,
    commentId,
    content,
  }: {
    postId: string;
    commentId: string;
    content: string;
  }) =>
    apiRequest<CommentView>(`${base(postId)}/${commentId}`, {
      method: 'PATCH',
      body: { content },
    }),
  deactivate: ({ postId, commentId }: { postId: string; commentId: string }) =>
    apiRequest<void>(`${base(postId)}/${commentId}/deactivate`, {
      method: 'POST',
    }),
};
