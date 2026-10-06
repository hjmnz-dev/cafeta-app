import { useCallback, type ReactNode, type RefObject } from 'react';
import type {
  InfiniteData,
  UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { userMessageOf } from '../lib/http';
import type { PostPage } from '../lib/posts-api';
import { toCardPost } from '../lib/posts';
import { useSession } from '../store/SessionStore';
import { InfiniteListFooter } from './InfiniteListFooter';
import { PostCard } from './PostCard';
import { PostListSkeleton } from './PostCardSkeleton';

export type PostPagesQuery = UseInfiniteQueryResult<InfiniteData<PostPage>>;

/**
 * Lista de publicaciones reales (spec 0005), la misma en el feed y el perfil:
 * esqueletos al cargar, error con "Reintentar", vacío propio de cada pantalla
 * y scroll infinito al final.
 */
export function LivePostList({
  query,
  empty,
  scrollRootRef,
}: {
  query: PostPagesQuery;
  empty: ReactNode;
  scrollRootRef: RefObject<HTMLElement | null>;
}) {
  const { user } = useSession();
  const { fetchNextPage, refetch } = query;
  const loadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  if (query.isPending) return <PostListSkeleton />;

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

  const views = query.data.pages.flatMap((page) => page.items);
  if (views.length === 0) return <>{empty}</>;

  const now = new Date();
  return (
    <>
      {views.map((view) => (
        <PostCard
          key={view.id}
          post={toCardPost(view, now)}
          live={{
            isMine: view.author.id === user?.id,
            authorId: view.author.id,
            isAnnouncement: view.type === 'ANNOUNCEMENT',
          }}
        />
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
