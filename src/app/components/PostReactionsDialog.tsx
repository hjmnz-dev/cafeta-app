import { useRef } from 'react';
import { Link } from 'react-router';
import { X } from 'lucide-react';
import { userMessageOf } from '../lib/http';
import { optionOf } from '../lib/reactions';
import { usePostReactors } from '../store/posts-queries';
import { InfiniteListFooter } from './InfiniteListFooter';
import { ProfileAvatar } from './ProfileAvatar';
import { VerifiedBadge } from './VerifiedBadge';

/**
 * Bug 1076 · Quién reaccionó a mi publicación y con qué.
 *
 * Solo para el autor: el conteo de su propia publicación la abre. Cada
 * persona lleva a su perfil, que aplica sus reglas de privacidad y bloqueo.
 */
export function PostReactionsDialog({
  postId,
  onClose,
}: {
  postId: string;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const reactors = usePostReactors(postId);
  const items = reactors.data?.pages.flatMap((p) => p.items) ?? [];
  const nextPageError = reactors.isFetchNextPageError
    ? userMessageOf(reactors.error)
    : null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        ref={scrollRef}
        role="dialog"
        aria-label="Reacciones de la publicación"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[430px] max-h-[70%] overflow-y-auto rounded-t-3xl bg-[var(--surface)] px-4 pt-3 pb-6 shadow-[var(--shadow-pop)]"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-[16px] text-[var(--ink)]">
            Reacciones
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar reacciones"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)] hover:bg-[var(--surface-2)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {reactors.isPending ? (
          <p className="py-6 text-center text-[14px] text-[var(--muted)]">
            Cargando reacciones…
          </p>
        ) : reactors.isError && items.length === 0 ? (
          <div className="py-6 flex flex-col items-center gap-3 text-center">
            <p className="text-[14px] text-[var(--muted)]">
              {userMessageOf(reactors.error)}
            </p>
            <button
              onClick={() => void reactors.refetch()}
              className="px-4 py-2 rounded-full text-[13px] font-semibold text-[var(--ink)] bg-[var(--surface-3)]"
            >
              Reintentar
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-[14px] text-[var(--muted)]">
            Aún nadie ha reaccionado a tu publicación.
          </p>
        ) : (
          <>
            <ul>
              {items.map((reactor) => {
                const option = optionOf(reactor.type);
                return (
                  <li
                    key={reactor.id}
                    className="border-b border-[var(--line-soft)] last:border-b-0"
                  >
                    <Link
                      to={`/u/${reactor.user.id}`}
                      aria-label={`${reactor.user.displayName} reaccionó con ${option.label}`}
                      className="py-2.5 flex items-center gap-3"
                    >
                      <ProfileAvatar
                        url={reactor.user.avatarUrl}
                        name={reactor.user.displayName}
                        size={40}
                        radius={20}
                        className="flex-none"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="flex items-center gap-1 font-semibold text-[14px] text-[var(--ink)] truncate">
                          {reactor.user.displayName}
                          {reactor.user.verified && <VerifiedBadge />}
                        </p>
                        <p className="text-[12px] text-[var(--muted)] truncate">
                          @{reactor.user.handle}
                        </p>
                      </div>
                      <span
                        aria-hidden="true"
                        className="text-[22px] leading-none"
                      >
                        {option.emoji}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <InfiniteListFooter
              scrollRootRef={scrollRef}
              hasNextPage={reactors.hasNextPage}
              isFetchingNextPage={reactors.isFetchingNextPage}
              errorMessage={nextPageError}
              onLoadMore={() => void reactors.fetchNextPage()}
            />
          </>
        )}
      </div>
    </div>
  );
}
