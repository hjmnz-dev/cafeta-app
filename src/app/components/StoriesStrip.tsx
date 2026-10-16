import { Link, useLocation } from 'react-router';
import {
  firstToWatch,
  groupOf,
  groupSeen,
  ringBackground,
} from '../lib/stories';
import { useSession } from '../store/SessionStore';
import { useStoryTray } from '../store/stories-queries';
import { MyStoryAvatar } from './MyStoryAvatar';
import { StoryAvatar } from './StoryAvatar';

/**
 * HU13 · Tira de historias del feed, contra la API (decisión 22).
 *
 * Muestra las historias vigentes de quienes sigo, agrupadas por autor. Cuando
 * no hay ninguna de terceros se explica por qué, en vez de dejar un hueco.
 *
 * Lo propio no ocupa un círculo aparte: vive en el avatar de siempre (ver
 * MyStoryAvatar), que abre las historias propias o lleva a publicar según dónde
 * se toque.
 */
export function StoriesStrip() {
  const { user } = useSession();
  const tray = useStoryTray();
  const { pathname: from } = useLocation();

  const groups = tray.data?.groups ?? [];
  const others = groups.filter((group) => group.author.id !== user?.id);
  const hasMine = Boolean(groupOf(groups, user?.id));

  return (
    <div className="px-4 py-3 flex gap-3.5 overflow-x-auto no-scrollbar">
      {/* Tu historia: publicar (HU12) y, si ya hay una, verla (HU13) */}
      <div className="flex flex-col items-center gap-1.5 min-w-[68px]">
        <MyStoryAvatar size={62} />
        <span className="text-[11px] text-[var(--muted)] font-medium">
          Tu historia
        </span>
      </div>

      {tray.isError ? (
        <div className="self-center text-[12px] text-[var(--muted)] leading-snug max-w-[220px]">
          <p>No pudimos cargar las historias.</p>
          <button
            type="button"
            onClick={() => void tray.refetch()}
            className="font-semibold text-[var(--brand)]"
          >
            Reintentar
          </button>
        </div>
      ) : tray.isPending ? (
        <span className="sr-only">Cargando historias</span>
      ) : others.length === 0 ? (
        <p className="self-center text-[12px] text-[var(--muted)] leading-snug max-w-[220px]">
          Sigue a alguien en{' '}
          <span className="font-semibold text-[var(--ink-2)]">Descubrir</span>{' '}
          para ver sus historias
          {hasMine ? '.' : ', o publica la tuya.'}
        </p>
      ) : (
        others.map((group) => (
          <Link
            key={group.author.id}
            to={`/stories/${firstToWatch(group)?.id}`}
            state={{ from }}
            className="flex flex-col items-center gap-1.5 min-w-[68px]"
            aria-label={`Ver historia de ${group.author.displayName}${groupSeen(group) ? ', ya vista' : ''}`}
          >
            {/* Anillo de historia vigente; gris si ya la vi (bug 1068) */}
            <div
              data-testid={`ring-${group.author.id}`}
              data-seen={groupSeen(group)}
              className="w-[62px] h-[62px] rounded-full p-[2.5px]"
              style={{ background: ringBackground(groupSeen(group)) }}
            >
              <StoryAvatar
                url={group.author.avatarUrl}
                name={group.author.displayName}
                className="w-full h-full border-2 border-[var(--surface)] text-[22px]"
              />
            </div>
            <span className="text-[11px] text-[var(--ink)] font-medium truncate w-[64px] text-center">
              {group.author.displayName.split(' ')[0]}
            </span>
          </Link>
        ))
      )}
    </div>
  );
}
