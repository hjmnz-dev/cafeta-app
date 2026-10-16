import { Link } from 'react-router';
import type { SearchUserView } from '../lib/search-api';
import { FollowButton } from './FollowButton';
import { StoryRing } from './StoryRing';
import { VerifiedBadge } from './VerifiedBadge';

/**
 * Una persona de la API con su botón Seguir (DEF-05). La comparten Descubrir y
 * la búsqueda global (DEF-07), así seguir a alguien se ve y se comporta igual
 * en las dos, y es el mismo botón del perfil (bug 1015). Con una historia
 * vigente, su foto lleva el anillo y la abre (bug 1047).
 */
export function UserRow({ user }: { user: SearchUserView }) {
  const avatar = user.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt={user.displayName}
      className="block w-[52px] h-[52px] rounded-full object-cover bg-[var(--line)] flex-none"
    />
  ) : (
    <div
      role="img"
      aria-label={user.displayName}
      className="w-[52px] h-[52px] rounded-full flex-none bg-gradient-to-br from-[var(--brand)] to-[var(--brand-strong)] flex items-center justify-center"
    >
      <span className="text-white font-semibold text-[18px]">
        {(user.displayName.trim()[0] ?? 'U').toUpperCase()}
      </span>
    </div>
  );

  return (
    <div className="px-5 py-3.5 flex items-center gap-3 border-b border-[var(--line)]/60">
      <StoryRing
        userId={user.id}
        name={user.displayName}
        fallback={
          <Link
            to={`/u/${user.id}`}
            tabIndex={-1}
            aria-hidden="true"
            className="flex-none"
          >
            {avatar}
          </Link>
        }
      >
        {avatar}
      </StoryRing>
      <Link to={`/u/${user.id}`} className="flex-1 min-w-0 text-left">
        <p className="flex items-center gap-1.5 font-semibold text-[15px] text-[var(--ink)] truncate">
          {user.displayName}
          {user.verified && <VerifiedBadge />}
        </p>
        <p className="text-[13px] text-[var(--muted)] truncate">
          @{user.handle}
          {user.careerName ? ` · ${user.careerName}` : ''}
        </p>
      </Link>
      <FollowButton
        compact
        profile={{
          id: user.id,
          displayName: user.displayName,
          followStatus: user.followStatus,
          canFollow: user.canFollow,
        }}
      />
    </div>
  );
}
