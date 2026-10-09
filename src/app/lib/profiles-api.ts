/**
 * Llamadas de perfil y privacidad (decisión 15). Los tipos salen del contrato
 * OpenAPI generado en api-types.ts, nunca escritos a mano.
 */
import type { components } from './api-types';
import { apiRequest } from './http';

type Schemas = components['schemas'];
export type ProfileView = Schemas['ProfileViewDto'];
export type Privacy = Schemas['PrivacyDto'];
export type UpdateProfile = Schemas['UpdateProfileDto'];
export type ProfileTag = Schemas['ProfileTagDto'];
export type ProfileVisibility = Schemas['ProfileVisibility'];

export const profilesApi = {
  view: (userId: string) => apiRequest<ProfileView>(`/users/${userId}/profile`),
  update: (changes: UpdateProfile) =>
    apiRequest<ProfileView>('/me/profile', { method: 'PATCH', body: changes }),
  privacy: () => apiRequest<Privacy>('/me/privacy'),
  updatePrivacy: (visibility: ProfileVisibility) =>
    apiRequest<Privacy>('/me/privacy', {
      method: 'PATCH',
      body: { visibility },
    }),
};
