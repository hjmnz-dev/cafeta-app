/**
 * Llamadas de la cuenta propia (spec 0009, decisión 11). Los tipos salen del
 * contrato OpenAPI generado en api-types.ts, nunca escritos a mano.
 */
import type { components } from './api-types';
import { apiRequest } from './http';

export type DeactivateAccountInput =
  components['schemas']['DeactivateAccountDto'];

export const accountApi = {
  /** Baja voluntaria: pide la contraseña y cierra todas las sesiones. */
  deactivate: (input: DeactivateAccountInput) =>
    apiRequest<void>('/me/deactivate', { method: 'POST', body: input }),
};
