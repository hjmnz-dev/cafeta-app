import { useRef } from 'react';
import { X } from 'lucide-react';
import { userMessageOf } from '../lib/http';
import { optionOf } from '../lib/reactions';
import type { StoryView } from '../lib/stories-api';
import { useStoryReactors } from '../store/stories-queries';
import { InfiniteListFooter } from './InfiniteListFooter';
import { StoryAvatar } from './StoryAvatar';
import { VerifiedBadge } from './VerifiedBadge';

/**
 * HU16 · Quién reaccionó a mi historia y con qué (bug 1018).
 *
 * La misma hoja de los comentarios, solo para el autor: el conteo de la
 * historia la abre y el visor se pausa mientras está abierta.
 */
export function StoryReactionsSheet({
  story,
  onClose,
}: {
  story: StoryView;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const reactors = useStoryReactors(story.id);
  const items = reactors.data?.pages.flatMap((p) => p.items) ?? [];
  const nextPageError = reactors.isFetchNextPageError
    ? userMessageOf(reactors.error)
    : null;

  return (
    <div
      ref={scrollRef}
      role="dialog"
      aria-label="Reacciones de la historia"
      className="absolute inset-x-0 bottom-0 z-30 max-h-[70%] overflow-y-auto rounded-t-3xl bg-[var(--surface)] px-4 pt-3 pb-6 shadow-[var(--shadow-pop)]"
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
          Aún nadie ha reaccionado a tu historia.
        </p>
      ) : (
        <>
          <ul>
            {items.map((reactor) => {
              const option = optionOf(reactor.type);
              return (
                <li
                  key={reactor.id}
                  className="py-2.5 flex items-center gap-3 border-b border-[var(--line-soft)] last:border-b-0"
                >
                  <StoryAvatar
                    url={reactor.user.avatarUrl}
                    name={reactor.user.displayName}
                    className="w-10 h-10 flex-none text-[15px]"
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
                    role="img"
                    aria-label={option.label}
                    className="text-[22px] leading-none"
                  >
                    {option.emoji}
                  </span>
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
  );
}
