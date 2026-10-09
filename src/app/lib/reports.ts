/**
 * Reglas puras del diálogo de reporte (spec 0008, decisión 30, HU55 y HU56).
 * Los motivos son los de la API; aquí solo se les pone el texto que ve la gente.
 */
import type { ReportReason } from './reports-api';

export const REPORT_DETAILS_MAX = 500;

export const REPORT_REASONS: ReadonlyArray<{
  code: ReportReason;
  label: string;
}> = [
  { code: 'INAPPROPRIATE', label: 'Contenido inapropiado' },
  { code: 'HARASSMENT', label: 'Acoso o intimidación' },
  { code: 'SPAM', label: 'Spam o publicidad' },
  { code: 'IMPERSONATION', label: 'Suplantación de identidad' },
  { code: 'OTHER', label: 'Otro' },
];

/** Cuenta en caracteres reales, igual que la API: un emoji vale uno. */
export function countChars(text: string): number {
  return [...text].length;
}

/** El detalle que se envía: sin espacios sobrantes y ausente si queda vacío. */
export function cleanDetails(details: string): string | undefined {
  const trimmed = details.trim();
  return trimmed === '' ? undefined : trimmed;
}

/** Por qué todavía no se puede enviar el reporte; null si ya se puede. */
export function reportBlocker(
  reason: ReportReason | null,
  details: string,
): string | null {
  if (!reason) return 'Elige un motivo.';
  const clean = cleanDetails(details);
  if (reason === 'OTHER' && !clean) return 'Cuéntanos qué pasó.';
  if (clean && countChars(clean) > REPORT_DETAILS_MAX) {
    return `El detalle pasa de ${REPORT_DETAILS_MAX} caracteres.`;
  }
  return null;
}
