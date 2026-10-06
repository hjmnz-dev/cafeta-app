import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  MapPin,
  MessageCircle,
  Lock,
  UserCheck,
  UserPlus,
  Clock,
  MoreHorizontal,
  Flag,
  Ban,
  Check,
} from 'lucide-react';
import { useAppState, TAG_CATEGORIES } from '../store/AppState';
import { isApiUserId } from '../lib/profiles';
import { LiveUserProfileScreen } from './LiveUserProfileScreen';
import { ReportDialog } from './ReportDialog';

/**
 * Perfil de otro usuario. Ruta: /u/:userId. Con un id de la API (UUID) es el
 * perfil real con su privacidad (decisión 15); con un id de la demo sigue el
 * prototipo de AppState hasta que Descubrir y Red usen la API (16 y 28).
 */
export function UserProfileScreen() {
  const { userId = '' } = useParams();
  return isApiUserId(userId) ? (
    <LiveUserProfileScreen key={userId} userId={userId} />
  ) : (
    <DemoUserProfileScreen userId={userId} />
  );
}

/**
 * Perfil de la demo. Base para DEF-05 (seguir/dejar de seguir) y punto
 * desde donde se bloquea o denuncia a esa persona (DEF-12 · HU53-HU55).
 */
function DemoUserProfileScreen({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const {
    getUser,
    followState,
    followUser,
    unfollowUser,
    isBlocked,
    blockUser,
    unblockUser,
    reportUser,
    hasReported,
  } = useAppState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reporting, setReporting] = useState(false);

  const user = getUser(userId);

  if (!user) {
    return (
      <div className="w-full h-full bg-[var(--app-bg)] flex flex-col">
        <div className="h-[60px] flex items-center gap-3 px-4 bg-[var(--surface)] border-b border-[var(--line)] mt-12">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--surface-3)]"
            aria-label="Volver"
          >
            <ArrowLeft className="w-6 h-6 text-[var(--ink)]" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-[var(--muted)]">
          Usuario no encontrado
        </div>
      </div>
    );
  }

  // HU53/HU54: mientras esté bloqueado no se muestra su contenido, solo la
  // vía para revertirlo.
  if (isBlocked(user.id)) {
    return (
      <div className="w-full h-full bg-[var(--app-bg)] flex flex-col">
        <div className="h-[60px] flex items-center gap-3 px-4 bg-[var(--surface)] border-b border-[var(--line)] mt-12">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--surface-3)]"
            aria-label="Volver"
          >
            <ArrowLeft className="w-6 h-6 text-[var(--ink)]" />
          </button>
          <span className="font-semibold text-[16px] text-[var(--ink)]">
            {user.name}
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <Ban className="w-9 h-9 text-[var(--muted)]" />
          <p className="text-[16px] font-semibold text-[var(--ink)]">
            Bloqueaste a {user.name}
          </p>
          <p className="text-[14px] text-[var(--muted)] leading-relaxed">
            No verás su contenido ni podrá interactuar contigo mientras siga
            bloqueado.
          </p>
          <button
            onClick={() => unblockUser(user.id)}
            className="mt-2 h-11 px-6 rounded-full bg-[var(--brand)] text-[var(--on-brand)] text-[15px] font-semibold hover:bg-[var(--brand-strong)] transition-colors"
          >
            Desbloquear
          </button>
        </div>
      </div>
    );
  }

  const state = followState(user.id);
  const following = state === 'following';
  const pending = state === 'pending';
  const followerCount = user.followers + (following ? 1 : 0);

  const onFollowClick = () =>
    state === 'none' ? followUser(user.id) : unfollowUser(user.id);

  return (
    <div className="w-full h-full bg-[var(--app-bg)] pb-[100px] overflow-y-auto">
      {/* Cover */}
      <div className="relative w-full h-[150px] bg-gradient-to-br from-[var(--brand-strong)] via-[var(--brand)] to-[var(--brand-bright)]">
        <div className="absolute top-12 left-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-black/25 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-sm hover:bg-black/35 transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-5 pb-6">
        {/* Avatar + acciones */}
        <div className="flex justify-between items-end -mt-9 mb-4 relative z-10">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-[78px] h-[78px] rounded-[24px] object-cover border-[4px] border-[var(--app-bg)] shadow-[0_4px_16px_rgba(23,19,19,0.2)] bg-[var(--line)]"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/messages')}
              className="w-[40px] h-[40px] rounded-full border-2 border-[var(--line)] bg-[var(--surface)] flex items-center justify-center text-[var(--ink)] hover:bg-[var(--surface-3)] transition-colors"
              aria-label="Enviar mensaje"
            >
              <MessageCircle className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={`Opciones sobre ${user.name}`}
              aria-expanded={menuOpen}
              className="w-[40px] h-[40px] rounded-full border-2 border-[var(--line)] bg-[var(--surface)] flex items-center justify-center text-[var(--ink)] hover:bg-[var(--surface-3)] transition-colors"
            >
              <MoreHorizontal className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={onFollowClick}
              aria-pressed={following || pending}
              className={
                'h-[40px] px-5 rounded-full font-semibold text-[14px] flex items-center gap-1.5 transition-colors shadow-sm ' +
                (following
                  ? 'bg-[var(--surface)] border-2 border-[var(--line)] text-[var(--ink)] hover:bg-[var(--surface-3)]'
                  : pending
                    ? 'bg-[var(--surface)] border-2 border-[var(--line)] text-[var(--muted)] hover:bg-[var(--surface-3)]'
                    : 'bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-strong)]')
              }
            >
              {following ? (
                <>
                  <UserCheck className="w-[16px] h-[16px]" /> Siguiendo
                </>
              ) : pending ? (
                <>
                  <Clock className="w-[16px] h-[16px]" /> Solicitado
                </>
              ) : (
                <>
                  <UserPlus className="w-[16px] h-[16px]" /> Seguir
                </>
              )}
            </button>
          </div>
        </div>

        {/* Moderación (HU53/HU55) */}
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-5 z-50 bg-[var(--surface)] rounded-2xl shadow-[var(--shadow-pop)] border border-[var(--app-bg)] overflow-hidden w-[210px]">
              <button
                onClick={() => {
                  setReporting(true);
                  setMenuOpen(false);
                }}
                disabled={hasReported('user', user.id)}
                className="w-full px-4 py-3 flex items-center gap-3 text-[14px] text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors disabled:text-[var(--muted)]"
              >
                {hasReported('user', user.id) ? (
                  <>
                    <Check className="w-4 h-4 text-[var(--muted)]" /> Usuario
                    reportado
                  </>
                ) : (
                  <>
                    <Flag className="w-4 h-4 text-[var(--muted)]" /> Reportar
                    usuario
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  blockUser(user.id);
                  setMenuOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-[14px] text-[var(--brand)] hover:bg-[var(--tint)] transition-colors border-t border-[var(--app-bg)]"
              >
                <Ban className="w-4 h-4" />
                Bloquear a {user.name.split(' ')[0]}
              </button>
            </div>
          </>
        )}

        {reporting && (
          <ReportDialog
            title="Reportar usuario"
            subject={`Perfil de ${user.name} (${user.handle})`}
            onClose={() => setReporting(false)}
            onConfirm={(reason) => {
              reportUser(user.id, reason);
              setReporting(false);
            }}
          />
        )}

        {/* Nombre */}
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <h1 className="font-['Space_Grotesk',sans-serif] font-bold text-[22px] text-[var(--ink)] leading-tight">
              {user.name}
            </h1>
            {user.visibility === 'private' && (
              <Lock className="w-4 h-4 text-[var(--muted)]" />
            )}
          </div>
          <p className="text-[var(--muted)] text-[15px] font-medium">
            {user.handle}
          </p>
        </div>

        {/* Bio: perfil privado no seguido oculta el contenido (HU07) */}
        {user.visibility === 'private' && !following ? (
          <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[18px] p-6 flex flex-col items-center text-center gap-2 my-4">
            <Lock className="w-6 h-6 text-[var(--muted)]" />
            <p className="text-[15px] font-semibold text-[var(--ink)]">
              Esta cuenta es privada
            </p>
            <p className="text-[13px] text-[var(--muted)]">
              Sigue a {user.name.split(' ')[0]} para ver su perfil y contenido.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[var(--ink)] text-[15px] leading-relaxed mb-4">
              {user.bio}
            </p>
            {user.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {user.tags.map((t) => {
                  const cat = TAG_CATEGORIES[t.category];
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
            <div className="flex items-center gap-4 text-[var(--muted)] text-[13px] font-medium mb-5">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span>{user.career} · INTEC</span>
              </div>
            </div>
          </>
        )}

        {/* Stats */}
        <div className="flex justify-between items-center bg-[var(--surface)] rounded-[20px] p-5 shadow-[0_2px_12px_rgba(23,19,19,0.06)] border border-[var(--line)]">
          <div className="flex flex-col items-center gap-1 flex-1">
            <span className="font-['Space_Grotesk',sans-serif] font-bold text-[18px] text-[var(--ink)]">
              {user.posts}
            </span>
            <span className="text-[var(--muted)] text-[12px] font-medium">
              Posts
            </span>
          </div>
          <div className="w-[1px] h-[30px] bg-[var(--line-soft)]" />
          <div
            className="flex flex-col items-center gap-1 flex-1"
            data-testid="follower-count"
          >
            <span className="font-['Space_Grotesk',sans-serif] font-bold text-[18px] text-[var(--ink)]">
              {followerCount.toLocaleString('es')}
            </span>
            <span className="text-[var(--muted)] text-[12px] font-medium">
              Seguidores
            </span>
          </div>
          <div className="w-[1px] h-[30px] bg-[var(--line-soft)]" />
          <div className="flex flex-col items-center gap-1 flex-1">
            <span className="font-['Space_Grotesk',sans-serif] font-bold text-[18px] text-[var(--ink)]">
              {user.following.toLocaleString('es')}
            </span>
            <span className="text-[var(--muted)] text-[12px] font-medium">
              Siguiendo
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
