/**
 * Borde con Sentry (spec 0007). Sin `VITE_SENTRY_DSN` (local, pruebas, el job
 * `check` de CI) no se inicia nada y todas las funciones son operaciones vacías.
 */
import * as Sentry from '@sentry/react';
import { ApiError } from './http';
import {
  createThrottle,
  scrubBreadcrumb,
  scrubBrowserEvent,
} from './monitoring-filters';

interface MonitoringEnv {
  VITE_SENTRY_DSN?: string;
  VITE_APP_VERSION?: string;
}

/** Opciones de Sentry: sin trazas, sin replay y sin datos personales. */
export function monitoringOptions(
  dsn: string,
  release: string,
): Sentry.BrowserOptions {
  const allow = createThrottle();
  return {
    dsn,
    environment: 'production',
    release,
    // El spec pide sendDefaultPii: false; en el SDK 11 eso pasó a dataCollection.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    },
    // Sin breadcrumbs de la consola: en el SDK 11 salen de la integración Console.
    integrations: (defaults) => defaults.filter((i) => i.name !== 'Console'),
    ignoreErrors: [/ResizeObserver loop/],
    denyUrls: [
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      /^safari-extension:\/\//,
    ],
    beforeSend: (event, hint) =>
      scrubBrowserEvent(event, hint, allow, Date.now()),
    beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
  };
}

/** Inicia Sentry solo si hay DSN. Se llama una vez, antes de dibujar. */
export function initMonitoring(env: MonitoringEnv = import.meta.env): void {
  const dsn = env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return;
  Sentry.init(monitoringOptions(dsn, env.VITE_APP_VERSION || 'dev'));
}

/** Monitoreo activo: Sentry se inició con un DSN. */
export function isMonitoringEnabled(): boolean {
  return Sentry.getClient() !== undefined;
}

/**
 * Reporta un error y devuelve el id del evento, o `undefined` si no se envía
 * (sin monitoreo, o un ApiError). Así la pantalla nunca muestra un código que
 * no exista en Sentry.
 */
export function reportError(error: unknown): string | undefined {
  if (!isMonitoringEnabled() || error instanceof ApiError) return undefined;
  return Sentry.captureException(error);
}

/** Asocia los eventos al id de la cuenta (nunca correo ni nombre). */
export function setMonitoringUser(id: string | null): void {
  if (!isMonitoringEnabled()) return;
  Sentry.setUser(id ? { id } : null);
}
