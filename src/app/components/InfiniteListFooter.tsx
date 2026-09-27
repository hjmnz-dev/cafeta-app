import { useEffect, useRef, type RefObject } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Final de una lista paginada (spec 0005). Un centinela invisible pide la
 * página siguiente al asomarse dentro del contenedor con scroll de la
 * pantalla (no la ventana: el marco del teléfono tiene su propio scroll).
 * Si esa página falla, muestra el aviso con "Reintentar" sin tocar lo cargado.
 */
export function InfiniteListFooter({
  scrollRootRef,
  hasNextPage,
  isFetchingNextPage,
  errorMessage,
  onLoadMore,
}: {
  scrollRootRef: RefObject<HTMLElement | null>;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  /** Mensaje traducido si falló la última página pedida. */
  errorMessage: string | null;
  onLoadMore: () => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const canLoad = hasNextPage && !isFetchingNextPage && errorMessage === null;

  // Se vuelve a observar cada vez que cambia canLoad: el observador nuevo
  // avisa de inmediato si el centinela sigue a la vista (página corta).
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!canLoad || !sentinel || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { root: scrollRootRef.current, rootMargin: '0px 0px 400px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [canLoad, onLoadMore, scrollRootRef]);

  return (
    <div ref={sentinelRef} data-testid="list-footer">
      {isFetchingNextPage && (
        <div className="py-5 flex justify-center" role="status">
          <Loader2
            className="w-5 h-5 text-[var(--muted)] animate-spin"
            aria-label="Cargando más publicaciones"
          />
        </div>
      )}
      {errorMessage !== null && (
        <div className="px-5 py-5 flex flex-col items-center gap-2 text-center">
          <p className="text-[13px] text-[var(--muted)]">{errorMessage}</p>
          <button
            onClick={onLoadMore}
            className="px-4 py-2 rounded-full text-[13px] font-semibold text-[var(--ink)] bg-[var(--surface-3)] transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}
