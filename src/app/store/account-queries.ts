/**
 * Hooks de la cuenta propia (spec 0009, decisión 11). La red queda en
 * account-api.ts y la caché en TanStack Query.
 */
import { useMutation } from '@tanstack/react-query';
import { accountApi } from '../lib/account-api';

/** Sin invalidar nada: al desactivar, la sesión termina y la caché se vacía. */
export function useDeactivateAccount() {
  return useMutation({ mutationFn: accountApi.deactivate });
}
