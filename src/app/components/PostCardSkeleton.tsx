import { Skeleton } from './ui/skeleton';

/** Tarjeta gris con la forma real de <PostCard />, mientras carga la lista. */
export function PostCardSkeleton() {
  return (
    <div
      data-testid="post-skeleton"
      aria-hidden="true"
      className="px-4 py-3.5 border-b border-[var(--line-soft)] flex gap-3"
    >
      <Skeleton className="w-11 h-11 rounded-full flex-none bg-[var(--surface-3)]" />
      <div className="flex-1 flex flex-col gap-2.5 pt-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-28 bg-[var(--surface-3)]" />
          <Skeleton className="h-3.5 w-20 bg-[var(--surface-3)]" />
        </div>
        <Skeleton className="h-3.5 w-full bg-[var(--surface-3)]" />
        <Skeleton className="h-3.5 w-4/5 bg-[var(--surface-3)]" />
        <div className="flex gap-4 pt-1">
          <Skeleton className="h-3.5 w-10 bg-[var(--surface-3)]" />
          <Skeleton className="h-3.5 w-10 bg-[var(--surface-3)]" />
        </div>
      </div>
    </div>
  );
}

export function PostListSkeleton() {
  return (
    <div role="status" aria-label="Cargando publicaciones">
      <PostCardSkeleton />
      <PostCardSkeleton />
      <PostCardSkeleton />
    </div>
  );
}
