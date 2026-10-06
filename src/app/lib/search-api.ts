/**
 * Llamadas de búsqueda y descubrimiento (spec 0008, decisión 28). Los tipos salen del
 * contrato OpenAPI generado en api-types.ts, nunca escritos a mano.
 */
import type { components } from './api-types';
import { apiRequest } from './http';
import { toQueryString } from './posts-api';

type Schemas = components['schemas'];
export type SearchUserView = Schemas['FollowUserViewDto'];
export type SearchUserPage = Schemas['FollowUserPageDto'];
export type SearchPostView = Schemas['PostViewDto'];
export type SearchPostPage = Schemas['PostPageDto'];

export const searchApi = {
  users: (q: string, cursor: string | null = null, limit?: number) =>
    apiRequest<SearchUserPage>(
      `/search/users${toQueryString({
        q,
        cursor,
        limit: limit !== undefined ? String(limit) : undefined,
      })}`,
    ),

  posts: (q: string, cursor: string | null = null, limit?: number) =>
    apiRequest<SearchPostPage>(
      `/search/posts${toQueryString({
        q,
        cursor,
        limit: limit !== undefined ? String(limit) : undefined,
      })}`,
    ),

  explore: (cursor: string | null = null, limit?: number) =>
    apiRequest<SearchPostPage>(
      `/explore/posts${toQueryString({
        cursor,
        limit: limit !== undefined ? String(limit) : undefined,
      })}`,
    ),
};
