/**
 * Cliente HTTP único de la app (spec 0004).
 *
 * Toda llamada a la API pasa por `apiRequest`: agrega el token de la sesión,
 * traduce el `code` de error a un mensaje para el usuario y, ante cualquier
 * 401, borra la sesión guardada y avisa con el evento `cafeta:session-ended`
 * (lo escucha el SessionStore). No guarda nada en variables del módulo: la
 * sesión se lee del almacenamiento en cada llamada.
 */
import { GENERIC_ERROR_MESSAGE, messageForCode } from './error-messages';

export const API_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export const SESSION_KEY = 'cafeta.session';
export const SESSION_ENDED_EVENT = 'cafeta:session-ended';

export interface StoredSession {
  accessToken: string;
  expiresAt: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly userMessage: string,
  ) {
    super(userMessage);
    this.name = 'ApiError';
  }
}

/** Texto para el usuario de cualquier error: el traducido si vino de la API. */
export function userMessageOf(error: unknown): string {
  return error instanceof ApiError ? error.userMessage : GENERIC_ERROR_MESSAGE;
}

function parseSession(raw: string | null): StoredSession | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as StoredSession).accessToken === 'string' &&
      typeof (value as StoredSession).expiresAt === 'string'
    ) {
      return value as StoredSession;
    }
  } catch {
    /* sesión corrupta: se trata como ausente */
  }
  return null;
}

/** Sesión guardada y vigente: primero la recordada, luego la de esta pestaña. */
export function readStoredSession(
  now: number = Date.now(),
): StoredSession | null {
  const session =
    parseSession(localStorage.getItem(SESSION_KEY)) ??
    parseSession(sessionStorage.getItem(SESSION_KEY));
  if (!session || Date.parse(session.expiresAt) <= now) return null;
  return session;
}

/** Con "Recordarme" va a localStorage; sin él, a sessionStorage. */
export function writeStoredSession(session: StoredSession, remember: boolean) {
  clearStoredSession();
  (remember ? localStorage : sessionStorage).setItem(
    SESSION_KEY,
    JSON.stringify(session),
  );
}

export function clearStoredSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

function codeOf(data: unknown): string {
  if (typeof data === 'object' && data !== null) {
    const code = (data as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return 'UNKNOWN';
}

// FormData viaja tal cual: el navegador pone el Content-Type con su boundary.
function encodeBody(body: unknown): BodyInit | undefined {
  if (body === undefined) return undefined;
  return body instanceof FormData ? body : JSON.stringify(body);
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body }: { method?: string; body?: unknown } = {},
): Promise<T> {
  const session = readStoredSession();
  const headers: Record<string, string> = {};
  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (session) headers.Authorization = `Bearer ${session.accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: encodeBody(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', messageForCode('NETWORK_ERROR'));
  }

  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const code = codeOf(data);
    if (res.status === 401) {
      clearStoredSession();
      window.dispatchEvent(new Event(SESSION_ENDED_EVENT));
    }
    throw new ApiError(res.status, code, messageForCode(code));
  }
  return data as T;
}
