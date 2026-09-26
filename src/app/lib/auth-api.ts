/**
 * Llamadas de auth y carreras (spec 0004). Los tipos salen del contrato
 * OpenAPI generado en api-types.ts, nunca escritos a mano.
 */
import type { components } from './api-types';
import { apiRequest } from './http';

type Schemas = components['schemas'];
export type AuthResponse = Schemas['AuthResponseDto'];
export type CurrentUser = Schemas['CurrentUserDto'];
export type Career = Schemas['CareerDto'];
export type RegisterInput = Schemas['RegisterDto'];
export type LoginInput = Schemas['LoginDto'];

export const authApi = {
  register: (input: RegisterInput) =>
    apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: input }),
  login: (input: LoginInput) =>
    apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: input }),
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }),
  me: () => apiRequest<CurrentUser>('/auth/me'),
};

export const careersApi = {
  list: () => apiRequest<Career[]>('/careers'),
};
