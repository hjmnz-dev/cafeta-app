import type { Career, CurrentUser } from './auth-api';

/** Textos de la pantalla de Configuración que salen de datos de la cuenta. */

const MEMBER_SINCE_FORMAT = new Intl.DateTimeFormat('es-DO', {
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Santo_Domingo',
});

/** "octubre de 2026" a partir de la fecha de registro (ISO 8601). */
export function memberSinceLabel(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : MEMBER_SINCE_FORMAT.format(date);
}

const VERIFICATION_LABELS: Readonly<
  Record<CurrentUser['verificationStatus'], string>
> = {
  PENDING: 'Pendiente de verificación',
  VERIFIED: 'Cuenta verificada',
  REJECTED: 'Verificación rechazada',
};

export function verificationLabel(
  status: CurrentUser['verificationStatus'],
): string {
  return VERIFICATION_LABELS[status];
}

/** El nombre de la carrera del usuario, o null si aún no carga o no tiene. */
export function careerNameOf(
  careers: readonly Career[] | undefined,
  careerId: string | null,
): string | null {
  if (!careerId) return null;
  return careers?.find((career) => career.id === careerId)?.name ?? null;
}
