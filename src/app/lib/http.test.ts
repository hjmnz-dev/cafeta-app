import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  API_URL,
  ApiError,
  apiRequest,
  clearStoredSession,
  readStoredSession,
  SESSION_ENDED_EVENT,
  SESSION_KEY,
  writeStoredSession,
} from './http';

// Cliente HTTP único (spec 0004, AC-5, AC-8 y AC-13). fetch es el borde que
// se simula; el almacenamiento es el de jsdom.
const FUTURE = '2099-01-01T00:00:00.000Z';
const PAST = '2000-01-01T00:00:00.000Z';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function respondWith(response: Response | Error) {
  const fetchMock = vi.mocked(fetch);
  fetchMock.mockImplementation(() =>
    response instanceof Error
      ? Promise.reject(response)
      : Promise.resolve(response),
  );
  return fetchMock;
}

const store = (
  storage: Storage,
  accessToken: string,
  expiresAt: string = FUTURE,
) => storage.setItem(SESSION_KEY, JSON.stringify({ accessToken, expiresAt }));

const headersOf = (fetchMock: ReturnType<typeof respondWith>) =>
  (fetchMock.mock.calls[0]?.[1]?.headers ?? {}) as Record<string, string>;

async function errorOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('se esperaba un ApiError');
}

describe('almacenamiento de la sesión', () => {
  it('AC-5: con "Recordarme" guarda en localStorage y sin él en sessionStorage', () => {
    writeStoredSession({ accessToken: 'largo', expiresAt: FUTURE }, true);
    expect(localStorage.getItem(SESSION_KEY)).toContain('largo');
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();

    writeStoredSession({ accessToken: 'corto', expiresAt: FUTURE }, false);
    expect(sessionStorage.getItem(SESSION_KEY)).toContain('corto');
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('prefiere la sesión recordada sobre la de la pestaña', () => {
    store(localStorage, 'recordada');
    store(sessionStorage, 'pestaña');
    expect(readStoredSession()?.accessToken).toBe('recordada');
  });

  it('usa la de la pestaña cuando no hay recordada', () => {
    store(sessionStorage, 'pestaña');
    expect(readStoredSession()?.accessToken).toBe('pestaña');
  });

  it('ignora una sesión vencida', () => {
    store(localStorage, 'vieja', PAST);
    expect(readStoredSession()).toBeNull();
  });

  it('vence justo en su expiresAt', () => {
    store(localStorage, 'justa', FUTURE);
    expect(readStoredSession(Date.parse(FUTURE))).toBeNull();
    expect(readStoredSession(Date.parse(FUTURE) - 1)?.accessToken).toBe(
      'justa',
    );
  });

  it.each([
    ['JSON roto', '{no es json'],
    ['sin accessToken', JSON.stringify({ expiresAt: FUTURE })],
    [
      'accessToken que no es texto',
      JSON.stringify({ accessToken: 1, expiresAt: FUTURE }),
    ],
    ['null', 'null'],
  ])('trata como ausente una sesión corrupta (%s)', (_caso, raw) => {
    localStorage.setItem(SESSION_KEY, raw);
    expect(readStoredSession()).toBeNull();
  });

  it('una sesión corrupta en localStorage no tapa la válida de la pestaña', () => {
    localStorage.setItem(SESSION_KEY, '{roto');
    store(sessionStorage, 'pestaña');
    expect(readStoredSession()?.accessToken).toBe('pestaña');
  });

  it('AC-8: clearStoredSession borra los dos almacenamientos', () => {
    store(localStorage, 'a');
    store(sessionStorage, 'b');
    clearStoredSession();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });
});

describe('apiRequest', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('llama a la URL de la API y devuelve el cuerpo', async () => {
    const fetchMock = respondWith(json(200, [{ id: '1', name: 'Medicina' }]));
    await expect(apiRequest('/careers')).resolves.toEqual([
      { id: '1', name: 'Medicina' },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_URL}/careers`,
      expect.objectContaining({ method: 'GET', body: undefined }),
    );
  });

  it('sin sesión no manda Authorization ni Content-Type en un GET', async () => {
    const fetchMock = respondWith(json(200, {}));
    await apiRequest('/careers');
    expect(headersOf(fetchMock)).toEqual({});
  });

  it('AC-5: agrega el Bearer de la sesión guardada', async () => {
    store(sessionStorage, 'token-123');
    const fetchMock = respondWith(json(200, {}));
    await apiRequest('/auth/me');
    expect(headersOf(fetchMock).Authorization).toBe('Bearer token-123');
  });

  it('no manda un token vencido', async () => {
    store(localStorage, 'viejo', PAST);
    const fetchMock = respondWith(json(200, {}));
    await apiRequest('/auth/me');
    expect(headersOf(fetchMock).Authorization).toBeUndefined();
  });

  it('manda el cuerpo como JSON con su Content-Type', async () => {
    const fetchMock = respondWith(json(200, {}));
    await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: 'a@est.intec.edu.do', remember: false },
    });
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(headersOf(fetchMock)['Content-Type']).toBe('application/json');
    expect(JSON.parse(String(init?.body))).toEqual({
      email: 'a@est.intec.edu.do',
      remember: false,
    });
  });

  it('AC-8: un 204 devuelve undefined sin leer el cuerpo', async () => {
    respondWith(new Response(null, { status: 204 }));
    await expect(
      apiRequest('/auth/logout', { method: 'POST' }),
    ).resolves.toBeUndefined();
  });

  it('AC-13: un error lanza ApiError con el mensaje traducido, nunca el message crudo', async () => {
    respondWith(
      json(409, {
        statusCode: 409,
        message: 'La cuenta ya existe (mensaje interno)',
        code: 'EMAIL_TAKEN',
      }),
    );
    const error = await errorOf(apiRequest('/auth/register'));
    expect(error).toMatchObject({
      status: 409,
      code: 'EMAIL_TAKEN',
      userMessage: 'Ya existe una cuenta con ese correo.',
      message: 'Ya existe una cuenta con ese correo.',
    });
  });

  it('AC-13: un error sin cuerpo JSON da el código UNKNOWN y el mensaje genérico', async () => {
    respondWith(new Response('<html>502</html>', { status: 502 }));
    const error = await errorOf(apiRequest('/careers'));
    expect(error).toMatchObject({
      status: 502,
      code: 'UNKNOWN',
      userMessage: 'Algo salió mal. Intenta de nuevo.',
    });
  });

  it('sin red lanza NETWORK_ERROR con estado 0', async () => {
    respondWith(new TypeError('Failed to fetch'));
    const error = await errorOf(apiRequest('/careers'));
    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    expect(error.userMessage).toBe(
      'No hay conexión con Cafeta. Intenta de nuevo.',
    );
  });

  it('AC-8: ante un 401 borra la sesión de los dos almacenamientos y avisa con el evento', async () => {
    store(localStorage, 'a');
    store(sessionStorage, 'b');
    const ended = vi.fn();
    window.addEventListener(SESSION_ENDED_EVENT, ended);
    respondWith(json(401, { statusCode: 401, code: 'SESSION_REVOKED' }));

    const error = await errorOf(apiRequest('/auth/me'));

    window.removeEventListener(SESSION_ENDED_EVENT, ended);
    expect(error.code).toBe('SESSION_REVOKED');
    expect(ended).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('un 403 no borra la sesión ni avisa que terminó', async () => {
    store(localStorage, 'a');
    const ended = vi.fn();
    window.addEventListener(SESSION_ENDED_EVENT, ended);
    respondWith(json(403, { statusCode: 403, code: 'ACCOUNT_INACTIVE' }));

    const error = await errorOf(apiRequest('/auth/login'));

    window.removeEventListener(SESSION_ENDED_EVENT, ended);
    expect(error.userMessage).toBe('Tu cuenta no está activa.');
    expect(ended).not.toHaveBeenCalled();
    expect(localStorage.getItem(SESSION_KEY)).not.toBeNull();
  });
});
