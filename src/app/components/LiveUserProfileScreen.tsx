import { useRef, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { ArrowLeft, Lock, MapPin, MessageCircle, Users } from 'lucide-react';
import { ApiError, userMessageOf } from '../lib/http';
import type { ProfileView } from '../lib/profiles-api';
import {
  firstNameOf,
  restrictedNotice,
  tagCategoryOf,
  VISIBILITY_LABEL,
} from '../lib/profiles';
import { TAG_CATEGORIES, useAppState } from '../store/AppState';
import { useProfile } from '../store/profiles-queries';
import { useUserPosts } from '../store/posts-queries';
import { useBlockUser } from '../store/blocks-queries';
import { useSession } from '../store/SessionStore';
import { FollowButton } from './FollowButton';
import { LivePostList } from './LivePostList';
import { ProfileOptionsMenu } from './ProfileOptionsMenu';

/**
 * Perfil de otro usuario desde la API (decisión 15, HU07 E2 y HU09). La API
 * decide qué se ve: completo, o limitado (foto, nombre, carrera, conteos y
 * Seguir) cuando la privacidad no deja ver el contenido.
 */
export function LiveUserProfileScreen({ userId }: { userId: string }) {
  const { user: me } = useSession();
  const profile = useProfile(userId);

  if (me?.id === userId) return <Navigate to="/profile" replace />;
  if (profile.isPending) return <ProfileShell loading />;
  if (!profile.data) {
    const notFound =
      profile.error instanceof ApiError &&
      profile.error.code === 'USER_NOT_FOUND';
    return (
      <ProfileShell>
        <p className="text-[15px] text-[var(--ink)]">
          {notFound ? 'Usuario no encontrado' : userMessageOf(profile.error)}
        </p>
        {!notFound && (
          <button
            onClick={() => void profile.refetch()}
            className="px-5 py-2 rounded-full text-[13px] font-semibold text-[var(--on-brand)] bg-[var(--brand)] hover:bg-[var(--brand-strong)] transition-colors"
          >
            Reintentar
          </button>
        )}
      </ProfileShell>
    );
  }
  return <ProfileBody profile={profile.data} />;
}

function BackButton({ overlay = false }: { overlay?: boolean }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(-1)}
      className={
        overlay
          ? 'w-10 h-10 bg-black/25 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-sm hover:bg-black/35 transition-colors'
          : 'w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--surface-3)]'
      }
      aria-label="Volver"
    >
      <ArrowLeft
        className={overlay ? 'w-5 h-5' : 'w-6 h-6 text-[var(--ink)]'}
      />
    </button>
  );
}

/** Marco con Volver para la carga, el error y el perfil que no existe. */
function ProfileShell({
  loading = false,
  children,
}: {
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="w-full h-full bg-[var(--app-bg)] flex flex-col">
      <div className="h-[60px] flex items-center gap-3 px-4 bg-[var(--surface)] border-b border-[var(--line)] mt-12">
        <BackButton />
      </div>
      {loading ? (
        <div
          className="px-5 py-6 flex flex-col gap-3"
          aria-busy="true"
          aria-label="Cargando perfil"
        >
          <div className="w-[78px] h-[78px] rounded-[24px] bg-[var(--line)] animate-pulse" />
          <div className="h-5 w-40 rounded bg-[var(--line)] animate-pulse" />
          <div className="h-4 w-24 rounded bg-[var(--line)] animate-pulse" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center text-[var(--muted)]">
          {children}
        </div>
      )}
    </div>
  );
}

/** Un conteo; con `to` lleva a su lista (HU32). */
function Stat({
  value,
  label,
  testId,
  to,
}: {
  value: number;
  label: string;
  testId?: string;
  to?: string;
}) {
  const body = (
    <>
      <span className="font-['Space_Grotesk',sans-serif] font-bold text-[18px] text-[var(--ink)]">
        {value.toLocaleString('es')}
      </span>
      <span className="text-[var(--muted)] text-[12px] font-medium">
        {label}
      </span>
    </>
  );
  const className = 'flex flex-col items-center gap-1 flex-1';
  return to ? (
    <Link
      to={to}
      className={`${className} rounded-[12px] hover:bg-[var(--surface-2)]`}
      data-testid={testId}
    >
      {body}
    </Link>
  ) : (
    <div className={className} data-testid={testId}>
      {body}
    </div>
  );
}

function ProfileBody({ profile }: { profile: ProfileView }) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const posts = useUserPosts(profile.id, profile.canSeeContent);
  const notice = restrictedNotice(profile);
  const initial = (profile.displayName.trim()[0] ?? 'C').toUpperCase();
  const blockMutation = useBlockUser();
  const { blockUser } = useAppState();

  return (
    <div
      ref={scrollRef}
      className="w-full h-full bg-[var(--app-bg)] pb-[100px] overflow-y-auto"
    >
      <div className="relative w-full h-[150px] bg-gradient-to-br from-[var(--brand-strong)] via-[var(--brand)] to-[var(--brand-bright)]">
        <div className="absolute top-12 left-4">
          <BackButton overlay />
        </div>
      </div>

      <div className="px-5 pb-4">
        <div className="flex justify-between items-end -mt-9 mb-4 relative z-10">
          {/* TODO(14): la foto de perfil llega con la subida de archivos. */}
          <div
            className="w-[78px] h-[78px] rounded-[24px] border-[4px] border-[var(--app-bg)] shadow-[0_4px_16px_rgba(23,19,19,0.2)] bg-[var(--brand)] flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="text-white font-['Space_Grotesk',sans-serif] font-bold text-[30px]">
              {initial}
            </span>
          </div>
          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => navigate('/messages')}
              className="w-[40px] h-[40px] rounded-full border-2 border-[var(--line)] bg-[var(--surface)] flex items-center justify-center text-[var(--ink)] hover:bg-[var(--surface-3)] transition-colors"
              aria-label="Enviar mensaje"
            >
              <MessageCircle className="w-[18px] h-[18px]" />
            </button>
            <ProfileOptionsMenu
              userId={profile.id}
              displayName={profile.displayName}
              handle={profile.handle}
              firstName={firstNameOf(profile.displayName)}
              onBlock={() => {
                blockMutation.mutate(profile.id);
                blockUser(profile.id);
              }}
            />
            <FollowButton profile={profile} />
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center gap-2">
            <h1 className="font-['Space_Grotesk',sans-serif] font-bold text-[22px] text-[var(--ink)] leading-tight">
              {profile.displayName}
            </h1>
            {profile.visibility !== 'PUBLIC' && (
              <span
                className="flex items-center gap-1 text-[11px] font-semibold text-[var(--muted)] bg-[var(--surface-3)] px-2 py-0.5 rounded-md"
                title={VISIBILITY_LABEL[profile.visibility]}
              >
                {profile.visibility === 'PRIVATE' ? (
                  <Lock className="w-3 h-3" aria-hidden="true" />
                ) : (
                  <Users className="w-3 h-3" aria-hidden="true" />
                )}
                {VISIBILITY_LABEL[profile.visibility]}
              </span>
            )}
          </div>
          <p className="text-[var(--muted)] text-[15px] font-medium">
            @{profile.handle}
          </p>
        </div>

        {profile.bio && (
          <p className="text-[var(--ink)] text-[15px] leading-relaxed mb-4">
            {profile.bio}
          </p>
        )}
        {profile.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {profile.tags.map((t) => {
              const cat = TAG_CATEGORIES[tagCategoryOf(t.category)];
              return (
                <span
                  key={t.label}
                  className="px-3 py-1 rounded-full text-[13px] font-semibold border shadow-sm"
                  style={{
                    background: cat.bg,
                    color: cat.text,
                    borderColor: cat.border,
                  }}
                >
                  {t.label}
                </span>
              );
            })}
          </div>
        )}
        {profile.careerName && (
          <div className="flex items-center gap-1.5 text-[var(--muted)] text-[13px] font-medium mb-5">
            <MapPin className="w-4 h-4" aria-hidden="true" />
            <span>{profile.careerName} · INTEC</span>
          </div>
        )}

        <div className="flex justify-between items-center bg-[var(--surface)] rounded-[20px] p-5 shadow-[0_2px_12px_rgba(23,19,19,0.06)] border border-[var(--line)]">
          <Stat value={profile.counts.posts} label="Posts" />
          <div className="w-[1px] h-[30px] bg-[var(--line-soft)]" />
          <Stat
            value={profile.counts.followers}
            label="Seguidores"
            testId="follower-count"
            to={
              profile.canSeeContent ? `/u/${profile.id}/followers` : undefined
            }
          />
          <div className="w-[1px] h-[30px] bg-[var(--line-soft)]" />
          <Stat
            value={profile.counts.following}
            label="Siguiendo"
            to={
              profile.canSeeContent ? `/u/${profile.id}/following` : undefined
            }
          />
        </div>
      </div>

      {notice ? (
        <div className="mx-5 bg-[var(--surface)] border border-[var(--line)] rounded-[18px] p-6 flex flex-col items-center text-center gap-2">
          <Lock className="w-6 h-6 text-[var(--muted)]" aria-hidden="true" />
          <p className="text-[15px] font-semibold text-[var(--ink)]">
            {notice.title}
          </p>
          <p className="text-[13px] text-[var(--muted)]">{notice.body}</p>
        </div>
      ) : (
        <LivePostList
          query={posts}
          scrollRootRef={scrollRef}
          empty={
            <p className="px-5 py-10 text-center text-[14px] text-[var(--muted)]">
              {firstNameOf(profile.displayName)} todavía no ha publicado.
            </p>
          }
        />
      )}
    </div>
  );
}
