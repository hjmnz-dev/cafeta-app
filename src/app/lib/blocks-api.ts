/**
 * Cliente HTTP para bloquear, desbloquear y listar usuarios bloqueados (decisión 29).
 * Los tipos salen del contrato OpenAPI de api-types.ts.
 */
import type { components } from './api-types';
import { apiRequest } from './http';

type Schemas = components['schemas'];
export type BlockStatus = Schemas['BlockStatusViewDto'];
export type BlockedUser = Schemas['BlockedUserViewDto'];
export type BlockedUserPage = Schemas['BlockedUserPageDto'];

export const blocksApi = {
  blockedUsers: (cursor?: string, limit = 20) =>
    apiRequest<BlockedUserPage>(
      `/blocks?limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
    ),
  block: (userId: string) =>
    apiRequest<BlockStatus>(`/users/${userId}/block`, {
      method: 'POST',
    }),
  unblock: (userId: string) =>
    apiRequest<void>(`/users/${userId}/block`, {
      method: 'DELETE',
    }),
};
