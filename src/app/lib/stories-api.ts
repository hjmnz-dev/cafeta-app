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

export const storiesApi = {
  /** Historias vigentes de quienes sigo y las mías, agrupadas por autor. */
  tray: () => apiRequest<StoryTray>('/stories'),
  create: (story: CreateStory) =>
    apiRequest<StoryView>('/stories', { method: 'POST', body: story }),
};
