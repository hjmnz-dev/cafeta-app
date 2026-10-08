/**
 * Llamadas de publicaciones y feed (spec 0005). Los tipos salen del contrato
 * OpenAPI generado en api-types.ts, nunca escritos a mano.
 */
import type { components } from './api-types';
import { apiRequest } from './http';

type Schemas = components['schemas'];
export type PostView = Schemas['PostViewDto'];
export type PostPage = Schemas['PostPageDto'];
export type PostCount = Schemas['PostCountDto'];
export type CreatePostInput = Schemas['CreatePostDto'];
export type UpdatePostInput = Schemas['UpdatePostDto'];
export type CampusLocation = NonNullable<CreatePostInput['location']>;

/** `?a=1&b=2` sin los valores vacíos; cadena vacía si no queda ninguno. */
export function toQueryString(
  params: Readonly<Record<string, string | null | undefined>>,
): string {
  const search = new URLSearchParams(
    Object.entries(params).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  ).toString();
  return search ? `?${search}` : '';
}

export type ReactionInput = Schemas['SetReactionDto'];
export type ReactionState = Schemas['ReactionStateDto'];

export const postsApi = {
  create: (input: CreatePostInput) =>
    apiRequest<PostView>('/posts', { method: 'POST', body: input }),
  feed: (careerId: string | null, cursor: string | null) =>
    apiRequest<PostPage>(`/posts/feed${toQueryString({ careerId, cursor })}`),
  byUser: (userId: string, cursor: string | null) =>
    apiRequest<PostPage>(`/users/${userId}/posts${toQueryString({ cursor })}`),
  countByUser: (userId: string) =>
    apiRequest<PostCount>(`/users/${userId}/posts/count`),
  // Acciones del autor (spec 0008, decisión 17).
  update: ({ id, ...input }: UpdatePostInput & { id: string }) =>
    apiRequest<PostView>(`/posts/${id}`, { method: 'PATCH', body: input }),
  deactivate: (id: string) =>
    apiRequest<void>(`/posts/${id}/deactivate`, { method: 'POST' }),
  reactivate: (id: string) =>
    apiRequest<void>(`/posts/${id}/reactivate`, { method: 'POST' }),
  remove: (id: string) =>
    apiRequest<void>(`/posts/${id}`, { method: 'DELETE' }),
  // Mi reacción (spec 0009, decisión 20): poner y quitar son idempotentes.
  react: (id: string, input: ReactionInput) =>
    apiRequest<ReactionState>(`/posts/${id}/reaction`, {
      method: 'PUT',
      body: input,
    }),
  unreact: (id: string) =>
    apiRequest<ReactionState>(`/posts/${id}/reaction`, { method: 'DELETE' }),
};
