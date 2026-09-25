import React from 'react';
import { Link, useLocation } from 'react-router';
import { useAppState, CURRENT_USER_ID, MY_AVATAR } from '../store/AppState';
import { visibleStories, playbackQueue } from '../lib/stories';

/**
 * DEF-04 · HU12/HU13 — El avatar propio como acceso a las historias.
 *
 * Un solo círculo con dos zonas de toque: el avatar abre las historias propias
 * vigentes (con anillo cuando las hay) y el "+" lleva a publicar otra. Lo usan
 * la tira del feed y la foto del perfil, para que el gesto sea el mismo en los
 * dos sitios y no haya dos sitios distintos donde publicar.
 *
 * Cuando todavía no hay historia propia, el círculo entero lleva a crearla y el
 * "+" queda decorativo: si fuera otro enlace, quien navega con teclado o lector
 * de pantalla oiría dos veces la misma acción.
 */
export function MyStoryAvatar({ size = 62 }: { size?: number }) {
  const { stories, followingIds } = useAppState();
  // De dónde se sale, para poder volver aquí al cerrar (feed o perfil).
  const { pathname: from } = useLocation();

  const visibles = visibleStories(stories, { currentUserId: CURRENT_USER_ID, followingIds });
  const mine = playbackQueue(visibles).filter((s) => s.authorId === CURRENT_USER_ID);
  const hasMine = mine.length > 0;

  const badgeSize = Math.round(size * 0.35);
  const badge =
    'absolute -bottom-0.5 -right-0.5 rounded-full bg-[var(--brand)] text-[var(--on-brand)] ' +
    'border-2 border-[var(--surface)] flex items-center justify-center leading-none font-bold';
  const badgeStyle = { width: badgeSize, height: badgeSize, fontSize: Math.round(badgeSize * 0.7) };

  const avatar = (ring: boolean) => (
    <img
      src={MY_AVATAR}
      alt=""
      className={
        'w-full h-full rounded-full object-cover bg-[var(--surface-3)] border-2 ' +
        (ring ? 'border-[var(--surface)]' : 'border-[var(--line)]')
      }
    />
  );

  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      {hasMine ? (
        <Link
          to={`/stories/${mine[0].id}`}
          state={{ from }}
          aria-label={`Ver historia de ${mine[0].authorName}`}
          className="block w-full h-full rounded-full p-[2.5px]"
          style={{ background: 'var(--story-ring)' }}
        >
          {avatar(true)}
        </Link>
      ) : (
        <Link to="/create-story" state={{ from }} aria-label="Crear historia" className="block w-full h-full">
          {avatar(false)}
        </Link>
      )}

      {hasMine ? (
        <Link to="/create-story" state={{ from }} aria-label="Crear historia" className={badge} style={badgeStyle}>
          +
        </Link>
      ) : (
        <span aria-hidden className={badge} style={badgeStyle}>
          +
        </span>
      )}
    </div>
  );
}
