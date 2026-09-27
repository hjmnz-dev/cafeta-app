/**
 * Sesión real contra la API (spec 0004).
 *
 * Guarda el token según "Recordarme" (localStorage o sessionStorage), valida
 * la sesión guardada con GET /auth/me al cargar y pasa a anónimo cuando el
 * cliente HTTP avisa con `cafeta:session-ended` (cualquier 401). El resto de
 * la app sigue con los datos de ejemplo de AppState hasta que cada
 * funcionalidad la conecte.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  authApi,
  type AuthResponse,
  type CurrentUser,
  type RegisterInput,
} from '../lib/auth-api';
import {
  clearStoredSession,
  readStoredSession,
  SESSION_ENDED_EVENT,
  writeStoredSession,
} from '../lib/http';

export type SessionStatus = 'loading' | 'anonymous' | 'authenticated';

interface SessionValue {
  status: SessionStatus;
  user: CurrentUser | null;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

type SessionState =
  | { status: 'loading'; user: null }
  | { status: 'anonymous'; user: null }
  | { status: 'authenticated'; user: CurrentUser };

const ANONYMOUS: SessionState = { status: 'anonymous', user: null };

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>(() =>
    readStoredSession() ? { status: 'loading', user: null } : ANONYMOUS,
  );

  // Al cargar con una sesión guardada, se confirma con la API.
  useEffect(() => {
    if (state.status !== 'loading') return;
    let active = true;
    authApi
      .me()
      .then((user) => active && setState({ status: 'authenticated', user }))
      .catch(() => active && setState(ANONYMOUS));
    return () => {
      active = false;
    };
    // Solo al montar: después el estado lo cambian login, register y logout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cualquier 401 del cliente HTTP termina la sesión en toda la app.
  useEffect(() => {
    const onEnded = () => setState(ANONYMOUS);
    window.addEventListener(SESSION_ENDED_EVENT, onEnded);
    return () => window.removeEventListener(SESSION_ENDED_EVENT, onEnded);
  }, []);

  const start = useCallback((res: AuthResponse, remember: boolean) => {
    writeStoredSession(
      { accessToken: res.accessToken, expiresAt: res.expiresAt },
      remember,
    );
    setState({ status: 'authenticated', user: res.user });
  }, []);

  const login = useCallback(
    async (email: string, password: string, remember: boolean) => {
      start(await authApi.login({ email, password, remember }), remember);
    },
    [start],
  );

  // El registro no tiene "Recordarme": la sesión dura lo que la pestaña.
  const register = useCallback(
    async (input: RegisterInput) => {
      start(await authApi.register(input), false);
    },
    [start],
  );

  // Cerrar sesión nunca falla para quien la usa: si la API no puede revocarla
  // (ya revocada, sin red), la sesión local se borra igual y el token vence solo.
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* nada que mostrar: la salida local ya basta */
    } finally {
      clearStoredSession();
      setState(ANONYMOUS);
    }
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      status: state.status,
      user: state.user,
      login,
      register,
      logout,
    }),
    [state, login, register, logout],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value)
    throw new Error('useSession debe usarse dentro de SessionProvider');
  return value;
}
