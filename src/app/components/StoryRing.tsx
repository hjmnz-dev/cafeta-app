import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { groupOf } from '../lib/stories';
import { useStoryTray } from '../store/stories-queries';

/**
 * HU12 · Bug 1047: el anillo de historia alrededor de cualquier avatar. Si su
 * dueño tiene historias vigentes que me llegan en la tira (las mismas reglas de
 * visibilidad), el avatar lleva el anillo y al tocarlo abre la primera; si no,
 * se dibuja tal cual. Todas las filas comparten la misma consulta de la tira.
 *
 * Es un enlace: no va dentro de otro enlace o botón, por eso las filas lo
 * ponen junto a su zona clicable, no adentro. `fallback` es lo que se dibuja
 * sin historia (por ejemplo el avatar con su enlace al perfil).
 */
export function StoryRing({
  userId,
  name,
  children,
  fallback,
}: {
  userId: string;
  name: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const tray = useStoryTray();
  // De dónde se sale, para volver aquí al cerrar el visor.
  const { pathname: from } = useLocation();
  const first = groupOf(tray.data?.groups ?? [], userId)?.stories[0];

  if (!first) return <>{fallback ?? children}</>;
  return (
    <Link
      to={`/stories/${first.id}`}
      state={{ from }}
      aria-label={`Ver historia de ${name}`}
      className="block flex-none rounded-full p-[2.5px]"
      style={{ background: 'var(--story-ring)' }}
    >
      <span className="block rounded-full border-2 border-[var(--surface)]">
        {children}
      </span>
    </Link>
  );
}
