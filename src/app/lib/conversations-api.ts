/**
 * Llamadas de mensajería (spec 0008, decisión 25). Los tipos salen del
 * contrato OpenAPI generado en api-types.ts, nunca escritos a mano.
 */
import type { components } from './api-types';
import { apiRequest } from './http';
import { toQueryString } from './posts-api';

type Schemas = components['schemas'];
export type ConversationView = Schemas['ConversationViewDto'];
export type ConversationPage = Schemas['ConversationPageDto'];
export type MessageView = Schemas['MessageViewDto'];
export type MessagePage = Schemas['MessagePageDto'];

export const conversationsApi = {
  inbox: (cursor: string | null) =>
    apiRequest<ConversationPage>(`/conversations${toQueryString({ cursor })}`),
  /** Crea la conversación con esa persona o devuelve la que ya existe. */
  open: (userId: string) =>
    apiRequest<ConversationView>('/conversations', {
      method: 'POST',
      body: { userId },
    }),
  get: (id: string) => apiRequest<ConversationView>(`/conversations/${id}`),
  messages: (id: string, cursor: string | null) =>
    apiRequest<MessagePage>(
      `/conversations/${id}/messages${toQueryString({ cursor })}`,
    ),
  send: (id: string, content: string) =>
    apiRequest<MessageView>(`/conversations/${id}/messages`, {
      method: 'POST',
      body: { content },
    }),
  markRead: (id: string) =>
    apiRequest<void>(`/conversations/${id}/read`, { method: 'POST' }),
  edit: (conversationId: string, messageId: string, content: string) =>
    apiRequest<MessageView>(
      `/conversations/${conversationId}/messages/${messageId}`,
      {
        method: 'PATCH',
        body: { content },
      },
    ),
  deactivate: (conversationId: string, messageId: string) =>
    apiRequest<void>(
      `/conversations/${conversationId}/messages/${messageId}/deactivate`,
      { method: 'POST' },
    ),
};
