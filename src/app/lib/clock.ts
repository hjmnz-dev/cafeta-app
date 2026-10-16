/**
 * La hora de la barra de estado del marco del teléfono: la hora local de
 * quien usa la app, como en un celular (12 horas, sin a. m./p. m.).
 */
export function clockLabel(date: Date): string {
  const hours = date.getHours() % 12 || 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** Milisegundos hasta el próximo cambio de minuto, para refrescar justo ahí. */
export function msToNextMinute(date: Date): number {
  return 60_000 - (date.getSeconds() * 1000 + date.getMilliseconds());
}
