import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import {
  firstToWatch,
  groupOf,
  groupSeen,
  ringBackground,
} from '../lib/stories';
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
  const group = groupOf(tray.data?.groups ?? [], userId);
  const first = group && firstToWatch(group);

  if (!group || !first) return <>{fallback ?? children}</>;
  return (
    <Link
      to={`/stories/${first.id}`}
      state={{ from }}
      aria-label={`Ver historia de ${name}`}
      // self-start: en una fila flex (la tarjeta de publicación) no se estira
      // a toda la altura (bug 1056); queda del tamaño del avatar.
      className="block flex-none self-start h-fit rounded-full p-[2.5px]"
      // Gris si ya vi todas sus historias (bug 1068).
      style={{ background: ringBackground(groupSeen(group)) }}
    >
      <span className="block rounded-full border-2 border-[var(--surface)]">
        {children}
      </span>
    </Link>
  );
}
