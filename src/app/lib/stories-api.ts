/**
 * Llamadas de historias (decisión 22). Los tipos salen del contrato OpenAPI
 * generado en api-types.ts, nunca escritos a mano.
 */
import type { components } from './api-types';
import { apiRequest } from './http';

type Schemas = components['schemas'];
export type StoryView = Schemas['StoryViewDto'];
export type StoryAuthor = Schemas['StoryAuthorDto'];
export type StoryGroup = Schemas['StoryGroupDto'];
export type StoryTray = Schemas['StoryTrayDto'];
export type CreateStory = Schemas['CreateStoryDto'];
export type EditStory = Schemas['EditStoryDto'];

export const storiesApi = {
  /** Historias vigentes de quienes sigo y las mías, agrupadas por autor. */
  tray: () => apiRequest<StoryTray>('/stories'),
  create: (story: CreateStory) =>
    apiRequest<StoryView>('/stories', { method: 'POST', body: story }),
  // Acciones del autor (spec 0009, decisión 23): solo el texto, y solo vigente.
  edit: ({ id, ...input }: EditStory & { id: string }) =>
    apiRequest<StoryView>(`/stories/${id}`, { method: 'PATCH', body: input }),
  deactivate: (id: string) =>
    apiRequest<void>(`/stories/${id}/deactivate`, { method: 'POST' }),
};
