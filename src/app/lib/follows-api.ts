/**
 * Llamadas de seguimiento (decisión 16). Los tipos salen del contrato OpenAPI
 * generado en api-types.ts, nunca escritos a mano.
 */
import type { components } from './api-types';
import { apiRequest } from './http';
import { toQueryString } from './posts-api';

type Schemas = components['schemas'];
export type FollowUser = Schemas['FollowUserViewDto'];
export type FollowUserPage = Schemas['FollowUserPageDto'];
export type FollowRequest = Schemas['FollowRequestViewDto'];
export type FollowRequestPage = Schemas['FollowRequestPageDto'];
export type FollowResult = Schemas['FollowStatusViewDto'];

/** Las dos listas de un perfil. */
export type FollowListKind = 'followers' | 'following';

export const followsApi = {
  follow: (userId: string) =>
    apiRequest<FollowResult>(`/users/${userId}/follow`, { method: 'POST' }),
  /** Deja de seguir o cancela la solicitud pendiente. */
  unfollow: (userId: string) =>
    apiRequest<void>(`/users/${userId}/follow`, { method: 'DELETE' }),
  list: (userId: string, kind: FollowListKind, cursor: string | null) =>
    apiRequest<FollowUserPage>(
      `/users/${userId}/${kind}${toQueryString({ cursor })}`,
    ),
  requests: (cursor: string | null) =>
    apiRequest<FollowRequestPage>(
      `/follows/requests${toQueryString({ cursor })}`,
    ),
  accept: (followId: string) =>
    apiRequest<void>(`/follows/${followId}/accept`, { method: 'POST' }),
  reject: (followId: string) =>
    apiRequest<void>(`/follows/${followId}/reject`, { method: 'POST' }),
};
