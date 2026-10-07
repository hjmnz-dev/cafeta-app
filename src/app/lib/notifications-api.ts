/**
 * Llamadas de notificaciones y preferencias (spec 0008, decisión 27). Los
 * tipos salen del contrato OpenAPI generado en api-types.ts.
 */
import type { components } from './api-types';
import { apiRequest } from './http';
import { toQueryString } from './posts-api';

type Schemas = components['schemas'];
export type NotificationView = Schemas['NotificationViewDto'];
export type NotificationPage = Schemas['NotificationPageDto'];
export type NotificationKind = Schemas['NotificationType'];
export type NotificationPreferences = Schemas['NotificationPreferencesDto'];
export type NotificationPreferencesUpdate =
  Schemas['UpdateNotificationPreferencesDto'];

export const notificationsApi = {
  list: (cursor: string | null) =>
    apiRequest<NotificationPage>(`/notifications${toQueryString({ cursor })}`),
  unreadCount: () =>
    apiRequest<Schemas['UnreadCountDto']>('/notifications/unread-count'),
  markRead: (id: string) =>
    apiRequest<void>(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () =>
    apiRequest<void>('/notifications/read-all', { method: 'POST' }),
  preferences: () =>
    apiRequest<NotificationPreferences>('/notifications/preferences'),
  updatePreferences: (changes: NotificationPreferencesUpdate) =>
    apiRequest<NotificationPreferences>('/notifications/preferences', {
      method: 'PATCH',
      body: changes,
    }),
};
