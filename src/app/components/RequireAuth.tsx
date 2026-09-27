import { Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from '../store/SessionStore';

/**
 * Guardia de las rutas protegidas (spec 0004). Decide al renderizar, así nunca
 * se ve contenido protegido: mientras confirma la sesión no muestra nada y sin
 * sesión manda al login recordando a dónde quería ir.
 */
export function RequireAuth() {
  const { status } = useSession();
  const location = useLocation();
  if (status === 'loading') return null;
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
