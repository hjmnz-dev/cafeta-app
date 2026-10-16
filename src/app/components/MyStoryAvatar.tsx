import { Link, useLocation } from 'react-router';
import {
  firstToWatch,
  groupOf,
  groupSeen,
  ringBackground,
} from '../lib/stories';
import { useProfile } from '../store/profiles-queries';
import { useSession } from '../store/SessionStore';
import { useStoryTray } from '../store/stories-queries';
import { StoryAvatar } from './StoryAvatar';

/**
 * HU12/HU13 · El avatar propio como acceso a las historias.
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
  const { user } = useSession();
  // La foto es la real de mi perfil (decisión 13); sin ella, la del anillo o mi inicial.
  const me = useProfile(user?.id ?? '', Boolean(user));
  const tray = useStoryTray();
  // De dónde se sale, para poder volver aquí al cerrar (feed o perfil).
  const { pathname: from } = useLocation();

  const mine = groupOf(tray.data?.groups ?? [], user?.id);
  const firstStory = mine && firstToWatch(mine);
  const name = me.data?.displayName ?? user?.profile.displayName ?? '';
  const avatarUrl = me.data?.avatarUrl ?? mine?.author.avatarUrl ?? null;

  const badgeSize = Math.round(size * 0.35);
  const badge =
    'absolute -bottom-0.5 -right-0.5 rounded-full bg-[var(--brand)] text-[var(--on-brand)] ' +
    'border-2 border-[var(--surface)] flex items-center justify-center leading-none font-bold';
  const badgeStyle = {
    width: badgeSize,
    height: badgeSize,
    fontSize: Math.round(badgeSize * 0.7),
  };

  const avatar = (ring: boolean) => (
    <StoryAvatar
      url={avatarUrl}
      name={name}
      className={
        'w-full h-full border-2 text-[22px] ' +
        (ring ? 'border-[var(--surface)]' : 'border-[var(--line)]')
      }
    />
  );

  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      {firstStory ? (
        <Link
          to={`/stories/${firstStory.id}`}
          state={{ from }}
          aria-label={`Ver historia de ${name}`}
          className="block w-full h-full rounded-full p-[2.5px]"
          style={{ background: ringBackground(mine ? groupSeen(mine) : false) }}
        >
          {avatar(true)}
        </Link>
      ) : (
        <Link
          to="/create-story"
          state={{ from }}
          aria-label="Crear historia"
          className="block w-full h-full"
        >
          {avatar(false)}
        </Link>
      )}

      {firstStory ? (
        <Link
          to="/create-story"
          state={{ from }}
          aria-label="Crear historia"
          className={badge}
          style={badgeStyle}
        >
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
