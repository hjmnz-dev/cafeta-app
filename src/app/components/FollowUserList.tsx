import { useCallback, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router';
import type {
  InfiniteData,
  UseInfiniteQueryResult,
} from '@tanstack/react-query';
import type { FollowUser } from '../lib/follows-api';
import { userMessageOf } from '../lib/http';
import { InfiniteListFooter } from './InfiniteListFooter';
import { VerifiedBadge } from './VerifiedBadge';

/** Inicial de la persona mientras no hay foto (la foto llega con la 14). */
function Initial({ user }: { user: Pick<FollowUser, 'displayName'> }) {
  return (
    <div
      className="w-[46px] h-[46px] rounded-full bg-[var(--brand)] flex items-center justify-center flex-none"
      aria-hidden="true"
    >
      <span className="text-white font-['Space_Grotesk',sans-serif] font-bold text-[18px]">
        {(user.displayName.trim()[0] ?? 'C').toUpperCase()}
      </span>
    </div>
  );
}

/** Fila de una persona de la red que lleva a su perfil; `actions` a la derecha. */
export function FollowUserRow({
  user,
  actions,
}: {
  user: FollowUser;
  actions?: ReactNode;
}) {
  return (
    <div className="px-5 py-3 flex items-center gap-3 border-b border-[var(--line-soft)]">
      <Link
        to={`/u/${user.id}`}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <Initial user={user} />
        <div className="flex-1 min-w-0">
          <p className="flex items-center gap-1 font-semibold text-[15px] text-[var(--ink)] truncate">
            {user.displayName}
            {user.verified && <VerifiedBadge />}
          </p>
          <p className="text-[13px] text-[var(--muted)] truncate">
            @{user.handle}
            {user.careerName ? ` · ${user.careerName}` : ''}
          </p>
        </div>
      </Link>
      {actions}
    </div>
  );
}

export function FollowListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando lista">
      {[0, 1, 2].map((i) => (
        <div key={i} className="px-5 py-3 flex items-center gap-3">
          <div className="w-[46px] h-[46px] rounded-full bg-[var(--line)] animate-pulse" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-4 w-36 rounded bg-[var(--line)] animate-pulse" />
            <div className="h-3 w-24 rounded bg-[var(--line)] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

type PagedQuery<Page> = UseInfiniteQueryResult<InfiniteData<Page>>;

/**
 * Lista paginada de la red (HU32): esqueleto, error con "Reintentar", vacío
 * propio de cada lista y scroll infinito. `render` dibuja cada elemento.
 */
export function PagedList<
  Item extends { id: string },
  Page extends { items: Item[] },
>({
  query,
  empty,
  scrollRootRef,
  render,
}: {
  query: PagedQuery<Page>;
  empty: ReactNode;
  scrollRootRef: RefObject<HTMLElement | null>;
  render: (item: Item) => ReactNode;
}) {
  const { fetchNextPage, refetch } = query;
  const loadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  if (query.isPending) return <FollowListSkeleton />;
  if (!query.data) {
    return (
      <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
        <p className="text-[14px] text-[var(--ink)]">
          {userMessageOf(query.error)}
        </p>
        <button
          onClick={() => void refetch()}
          className="px-5 py-2 rounded-full text-[13px] font-semibold text-[var(--on-brand)] bg-[var(--brand)] hover:bg-[var(--brand-strong)] transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const items = query.data.pages.flatMap((page) => page.items);
  if (items.length === 0) return <>{empty}</>;
  return (
    <>
      {items.map((item) => (
        <div key={item.id}>{render(item)}</div>
      ))}
      <InfiniteListFooter
        scrollRootRef={scrollRootRef}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        errorMessage={
          query.isFetchNextPageError ? userMessageOf(query.error) : null
        }
        onLoadMore={loadMore}
      />
    </>
  );
}

/** Estado vacío de una lista de la red. */
export function EmptyList({ children }: { children: ReactNode }) {
  return (
    <p className="px-5 py-14 text-center text-[14px] text-[var(--muted)]">
      {children}
    </p>
  );
}
