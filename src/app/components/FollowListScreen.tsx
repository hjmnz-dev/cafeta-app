import { useRef } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Lock } from 'lucide-react';
import type { FollowListKind, FollowUser } from '../lib/follows-api';
import { userMessageOf } from '../lib/http';
import { firstNameOf, restrictedNotice } from '../lib/profiles';
import { useFollowList } from '../store/follows-queries';
import { useProfile } from '../store/profiles-queries';
import { useSession } from '../store/SessionStore';
import {
  EmptyList,
  FollowListSkeleton,
  FollowUserRow,
  PagedList,
} from './FollowUserList';

const TITLE: Readonly<Record<FollowListKind, string>> = {
  followers: 'Seguidores',
  following: 'Siguiendo',
};

/**
 * Seguidores o seguidos de otro usuario (decisión 16, HU32). Solo se ven si su
 * privacidad deja ver su contenido; si no, el mismo aviso que en su perfil.
 * Ruta: /u/:userId/followers y /u/:userId/following.
 */
export function FollowListScreen({ kind }: { kind: FollowListKind }) {
  const navigate = useNavigate();
  const { userId = '' } = useParams();
  const { user: me } = useSession();
  const scrollRef = useRef<HTMLDivElement>(null);
  const profile = useProfile(userId);
  const list = useFollowList(
    userId,
    kind,
    profile.data?.canSeeContent ?? false,
  );

  if (me?.id === userId)
    return <Navigate to={`/network?tab=${kind}`} replace />;

  const name = profile.data ? firstNameOf(profile.data.displayName) : '';
  const notice = profile.data ? restrictedNotice(profile.data) : null;

  return (
    <div className="w-full h-full bg-[var(--app-bg)] flex flex-col">
      <div className="h-[60px] flex items-center gap-3 px-4 bg-[var(--surface)] border-b border-[var(--line)] mt-12 flex-none">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--surface-3)]"
          aria-label="Volver"
        >
          <ArrowLeft className="w-6 h-6 text-[var(--ink)]" />
        </button>
        <div className="min-w-0">
          <h1 className="text-[17px] font-semibold text-[var(--ink)] font-['Space_Grotesk',sans-serif]">
            {TITLE[kind]}
          </h1>
          {profile.data && (
            <p className="text-[12px] text-[var(--muted)] truncate">
              {profile.data.displayName}
            </p>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-[100px]">
        {profile.isPending ? (
          <FollowListSkeleton />
        ) : !profile.data ? (
          <EmptyList>{userMessageOf(profile.error)}</EmptyList>
        ) : notice ? (
          <div className="m-5 bg-[var(--surface)] border border-[var(--line)] rounded-[18px] p-6 flex flex-col items-center text-center gap-2">
            <Lock className="w-6 h-6 text-[var(--muted)]" aria-hidden="true" />
            <p className="text-[15px] font-semibold text-[var(--ink)]">
              {notice.title}
            </p>
            <p className="text-[13px] text-[var(--muted)]">{notice.body}</p>
          </div>
        ) : (
          <PagedList<FollowUser, { items: FollowUser[] }>
            query={list}
            scrollRootRef={scrollRef}
            render={(user) => <FollowUserRow user={user} />}
            empty={
              <EmptyList>
                {kind === 'followers'
                  ? `${name} aún no tiene seguidores.`
                  : `${name} aún no sigue a nadie.`}
              </EmptyList>
            }
          />
        )}
      </div>
    </div>
  );
}
