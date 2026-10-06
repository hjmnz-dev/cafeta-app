import { useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import type {
  FollowRequest,
  FollowRequestPage,
  FollowUser,
  FollowUserPage,
} from '../lib/follows-api';
import { userMessageOf } from '../lib/http';
import { firstNameOf } from '../lib/profiles';
import {
  useFollowList,
  useFollowRequests,
  useRespondRequest,
} from '../store/follows-queries';
import { useSession } from '../store/SessionStore';
import { EmptyList, FollowUserRow, PagedList } from './FollowUserList';

type Tab = 'followers' | 'following' | 'requests';

const TABS: readonly { value: Tab; label: string }[] = [
  { value: 'followers', label: 'Seguidores' },
  { value: 'following', label: 'Siguiendo' },
  { value: 'requests', label: 'Solicitudes' },
];

function tabOf(value: string | null): Tab {
  return TABS.some((t) => t.value === value) ? (value as Tab) : 'followers';
}

/**
 * Mi red (decisión 16, HU32): quién me sigue, a quién sigo y las solicitudes
 * que me llegan, que solo yo apruebo o rechazo. Ruta: /network?tab=…
 */
export function NetworkScreen() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = tabOf(params.get('tab'));
  const { user } = useSession();
  const myId = user?.id ?? '';
  const scrollRef = useRef<HTMLDivElement>(null);

  const followers = useFollowList(myId, 'followers', tab === 'followers');
  const following = useFollowList(myId, 'following', tab === 'following');
  const requests = useFollowRequests();
  const pendingCount =
    requests.data?.pages.reduce((n, p) => n + p.items.length, 0) ?? 0;

  return (
    <div className="w-full h-full bg-[var(--app-bg)] flex flex-col">
      <div className="bg-[var(--surface)] border-b border-[var(--line)] mt-12 flex-none">
        <div className="h-[60px] flex items-center gap-3 px-4">
          <button
            onClick={() => navigate('/profile')}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--surface-3)]"
            aria-label="Volver"
          >
            <ArrowLeft className="w-6 h-6 text-[var(--ink)]" />
          </button>
          <h1 className="text-[17px] font-semibold text-[var(--ink)] font-['Space_Grotesk',sans-serif]">
            Mi red
          </h1>
        </div>
        <div role="tablist" className="flex px-2">
          {TABS.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setParams({ tab: t.value }, { replace: true })}
              className={`flex-1 py-3 text-[14px] font-semibold border-b-2 transition-colors ${tab === t.value ? 'border-[var(--brand)] text-[var(--ink)]' : 'border-transparent text-[var(--muted)]'}`}
            >
              {t.label}
              {t.value === 'requests' && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 rounded-full text-[11px] bg-[var(--brand)] text-[var(--on-brand)]">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={scrollRef}
        role="tabpanel"
        className="flex-1 overflow-y-auto pb-[100px]"
      >
        {tab === 'followers' && (
          <PagedList<FollowUser, FollowUserPage>
            query={followers}
            scrollRootRef={scrollRef}
            render={(u) => <FollowUserRow user={u} />}
            empty={<EmptyList>Aún no tienes seguidores.</EmptyList>}
          />
        )}
        {tab === 'following' && (
          <PagedList<FollowUser, FollowUserPage>
            query={following}
            scrollRootRef={scrollRef}
            render={(u) => <FollowUserRow user={u} />}
            empty={<EmptyList>Todavía no sigues a nadie.</EmptyList>}
          />
        )}
        {tab === 'requests' && (
          <PagedList<FollowRequest, FollowRequestPage>
            query={requests}
            scrollRootRef={scrollRef}
            render={(r) => <RequestRow request={r} />}
            empty={<EmptyList>No tienes solicitudes pendientes.</EmptyList>}
          />
        )}
      </div>
    </div>
  );
}

function RequestRow({ request }: { request: FollowRequest }) {
  const respond = useRespondRequest();
  const name = firstNameOf(request.follower.displayName);

  const answer = (accept: boolean) =>
    respond.mutate(
      { followId: request.id, accept },
      {
        onSuccess: () =>
          toast.success(
            accept
              ? `${name} ahora te sigue`
              : `Rechazaste la solicitud de ${name}`,
          ),
        onError: (error) => toast.error(userMessageOf(error)),
      },
    );

  return (
    <FollowUserRow
      user={request.follower}
      actions={
        <div className="flex items-center gap-2 flex-none">
          <button
            onClick={() => answer(true)}
            disabled={respond.isPending}
            aria-label={`Aceptar la solicitud de ${name}`}
            className="h-[34px] px-3 rounded-full text-[13px] font-semibold flex items-center gap-1 bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-strong)] disabled:opacity-60"
          >
            <Check className="w-4 h-4" aria-hidden="true" /> Aceptar
          </button>
          <button
            onClick={() => answer(false)}
            disabled={respond.isPending}
            aria-label={`Rechazar la solicitud de ${name}`}
            className="h-[34px] w-[34px] rounded-full flex items-center justify-center border-2 border-[var(--line)] text-[var(--muted)] hover:bg-[var(--surface-3)] disabled:opacity-60"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      }
    />
  );
}
