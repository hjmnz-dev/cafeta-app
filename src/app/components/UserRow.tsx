import { useNavigate } from 'react-router';
import { Lock, UserCheck, UserPlus, Clock } from 'lucide-react';
import { useAppState, DirectoryUser } from '../store/AppState';

/**
 * Fila de usuario del directorio, con su botón de seguimiento (DEF-05).
 *
 * La comparten "Descubrir" y la búsqueda global (DEF-07) para que seguir a
 * alguien se vea y se comporte igual desde ambas pantallas.
 */
export interface UserRowData {
  id: string;
  name: string;
  handle?: string;
  career?: string | null;
  avatar?: string | null;
  visibility?:
    'public' | 'followers' | 'private' | 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
  followers?: number;
}

export function UserRow({ user }: { user: UserRowData | DirectoryUser }) {
  const navigate = useNavigate();
  const { followState, followUser, unfollowUser } = useAppState();

  const state = followState(user.id);
  const following = state === 'following';
  const pending = state === 'pending';

  return (
    <div className="px-5 py-3.5 flex items-center gap-3 border-b border-[var(--line)]/60">
      <button
        onClick={() => navigate(`/u/${user.id}`)}
        className="flex items-center gap-3 flex-1 min-w-0 text-left"
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-[52px] h-[52px] rounded-full object-cover bg-[var(--line)] flex-none"
          />
        ) : (
          <div
            role="img"
            aria-label={user.name}
            className="w-[52px] h-[52px] rounded-full flex-none bg-gradient-to-br from-[var(--brand)] to-[var(--brand-strong)] flex items-center justify-center"
          >
            <span className="text-white font-semibold text-[18px]">
              {(user.name.trim()[0] ?? 'U').toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-[15px] text-[var(--ink)] truncate">
              {user.name}
            </p>
            {(user.visibility === 'private' ||
              user.visibility === 'PRIVATE') && (
              <Lock className="w-3.5 h-3.5 text-[var(--muted)] flex-none" />
            )}
          </div>
          <p className="text-[13px] text-[var(--muted)] truncate">
            {user.followers !== undefined
              ? `${user.career ?? ''} · ${user.followers.toLocaleString('es')} seguidores`
              : (user.career ?? (user.handle ? `@${user.handle}` : ''))}
          </p>
        </div>
      </button>
      <button
        onClick={() =>
          state === 'none' ? followUser(user.id) : unfollowUser(user.id)
        }
        aria-label={
          following
            ? `Dejar de seguir a ${user.name}`
            : pending
              ? `Cancelar solicitud a ${user.name}`
              : `Seguir a ${user.name}`
        }
        className={
          'h-[34px] px-4 rounded-full text-[13px] font-semibold flex items-center gap-1.5 flex-none transition-colors ' +
          (following
            ? 'bg-[var(--surface)] border-2 border-[var(--line)] text-[var(--ink)] hover:bg-[var(--surface-3)]'
            : pending
              ? 'bg-[var(--surface)] border-2 border-[var(--line)] text-[var(--muted)] hover:bg-[var(--surface-3)]'
              : 'bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-strong)]')
        }
      >
        {following ? (
          <>
            <UserCheck className="w-4 h-4" /> Siguiendo
          </>
        ) : pending ? (
          <>
            <Clock className="w-4 h-4" /> Solicitado
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4" /> Seguir
          </>
        )}
      </button>
    </div>
  );
}
