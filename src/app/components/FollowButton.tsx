import { Clock, UserCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { userMessageOf } from '../lib/http';
import type { ProfileView } from '../lib/profiles-api';
import { firstNameOf } from '../lib/profiles';
import { useFollow, useUnfollow } from '../store/follows-queries';

/**
 * Seguir, cancelar la solicitud y dejar de seguir (decisión 16, HU26 y HU27).
 * La API decide si seguir es inmediato (PUBLIC) o queda pendiente (FOLLOWERS).
 */
export function FollowButton({
  profile,
}: {
  profile: Pick<
    ProfileView,
    'id' | 'displayName' | 'followStatus' | 'canFollow'
  >;
}) {
  const follow = useFollow();
  const unfollow = useUnfollow();
  const state = profile.followStatus;
  const busy = follow.isPending || unfollow.isPending;
  const name = firstNameOf(profile.displayName);

  // Un PRIVATE sin seguimiento previo no muestra el botón (decisión 15).
  if (!profile.canFollow && state === 'NONE') return null;

  const onError = (error: unknown) => toast.error(userMessageOf(error));
  const onClick = () => {
    if (busy) return;
    if (state === 'NONE') {
      follow.mutate(profile.id, {
        onSuccess: (result) =>
          toast.success(
            result.status === 'PENDING'
              ? `Le enviaste una solicitud a ${name}`
              : `Ahora sigues a ${name}`,
          ),
        onError,
      });
    } else {
      unfollow.mutate(profile.id, {
        onSuccess: () =>
          toast.success(
            state === 'PENDING'
              ? 'Cancelaste la solicitud'
              : `Dejaste de seguir a ${name}`,
          ),
        onError,
      });
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-pressed={state !== 'NONE'}
      aria-label={
        state === 'ACCEPTED'
          ? `Dejar de seguir a ${name}`
          : state === 'PENDING'
            ? `Cancelar la solicitud a ${name}`
            : `Seguir a ${name}`
      }
      className={
        'h-[40px] px-5 rounded-full font-semibold text-[14px] flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-60 ' +
        (state === 'NONE'
          ? 'bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-strong)]'
          : 'bg-[var(--surface)] border-2 border-[var(--line)] hover:bg-[var(--surface-3)] ' +
            (state === 'PENDING' ? 'text-[var(--muted)]' : 'text-[var(--ink)]'))
      }
    >
      {state === 'ACCEPTED' ? (
        <>
          <UserCheck className="w-[16px] h-[16px]" aria-hidden="true" />{' '}
          Siguiendo
        </>
      ) : state === 'PENDING' ? (
        <>
          <Clock className="w-[16px] h-[16px]" aria-hidden="true" /> Solicitado
        </>
      ) : (
        <>
          <UserPlus className="w-[16px] h-[16px]" aria-hidden="true" /> Seguir
        </>
      )}
    </button>
  );
}
