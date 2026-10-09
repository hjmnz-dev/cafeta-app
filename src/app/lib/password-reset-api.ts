/**
 * Recuperar la contraseña por correo (spec 0008, decisión 10). Los tipos salen
 * del contrato OpenAPI generado en api-types.ts, nunca escritos a mano.
 */
import type { components } from './api-types';
import { apiRequest } from './http';

type Schemas = components['schemas'];
export type ForgotPasswordInput = Schemas['ForgotPasswordDto'];
export type ResetPasswordInput = Schemas['ResetPasswordDto'];

export const passwordResetApi = {
  /** Responde igual exista o no la cuenta: nunca revela quién está registrado. */
  requestLink: (input: ForgotPasswordInput) =>
    apiRequest<void>('/auth/forgot-password', { method: 'POST', body: input }),
  reset: (input: ResetPasswordInput) =>
    apiRequest<void>('/auth/reset-password', { method: 'POST', body: input }),
};
