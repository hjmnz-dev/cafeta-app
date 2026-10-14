import { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Search, X } from 'lucide-react';
import { useAppState } from '../store/AppState';
import { searchUsers, searchPosts } from '../lib/search';
import { UserRow } from './UserRow';
import { PostCard } from './PostCard';
import { useSession } from '../store/SessionStore';
import {
  useSearchUsers,
  useSearchPosts,
  useExplorePosts,
} from '../store/search-queries';
import { LivePostList } from './LivePostList';
import { InfiniteListFooter } from './InfiniteListFooter';
import { userMessageOf } from '../lib/http';

/**
 * DEF-07 · HU41/HU42/HU40 — Búsqueda global de personas, contenido y explorar.
 *
 * Una sola caja para las dos historias, separadas en pestañas: escribir una vez
 * y ver si lo que buscabas era una persona o una publicación. Con sesión activa
 * consulta la API real (/search/users, /search/posts, /explore/posts); en modo demo
 * corre sobre el store local.
 */

type Tab = 'people' | 'posts';

export function SearchScreen() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { users, posts, isBlocked } = useAppState();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('people');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const isLive = Boolean(user);

  // Queries en vivo para usuario autenticado
  const liveUsersQuery = useSearchUsers(query, isLive);
  const livePostsQuery = useSearchPosts(query, isLive);
  const liveExploreQuery = useExplorePosts(isLive && !trimmed);

  // Datos locales para modo demo / fallback
  const localUserResults = useMemo(
    () => searchUsers(users, query).filter((u) => !isBlocked(u.id)),
    [users, query, isBlocked],
  );
  const localPostResults = useMemo(
    () => searchPosts(posts, query).filter((p) => !isBlocked(p.authorId)),
    [posts, query, isBlocked],
  );

  /** Sugerencias tomadas del propio directorio, no inventadas. */
  const suggestions = useMemo(() => {
    const labels = users.flatMap((u) => [
      u.career,
      ...u.tags.map((t) => t.label),
    ]);
    return Array.from(new Set(labels)).slice(0, 6);
  }, [users]);

  // Conteos
  const liveUserItems =
    liveUsersQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const liveUserCount = liveUserItems.length;
  const livePostCount =
    livePostsQuery.data?.pages.flatMap((p) => p.items).length ?? 0;

  const userCount =
    isLive && trimmed.length >= 2 ? liveUserCount : localUserResults.length;
  const postCount =
    isLive && trimmed.length >= 2 ? livePostCount : localPostResults.length;

  return (
    <div className="w-full h-full bg-[var(--app-bg)] flex flex-col">
      {/* Header con la caja de búsqueda */}
      <div className="bg-[var(--surface)] border-b border-[var(--line)] px-4 pt-14 pb-0 flex-none">
        <div className="flex items-center gap-2 py-2">
          <button
            onClick={() => navigate(-1)}
            aria-label="Volver"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--surface-3)] flex-none"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--ink)]" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--muted)]" />
            <input
              type="text"
              autoFocus
              aria-label="Buscar"
              placeholder="Buscar personas, publicaciones o etiquetas..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-2.5 bg-[var(--surface-3)] rounded-[16px] border border-[var(--line)] text-[15px] text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--brand)] transition-all"
            />
            {trimmed && (
              <button
                onClick={() => setQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--line)]"
              >
                <X className="w-4 h-4 text-[var(--muted)]" />
              </button>
            )}
          </div>
        </div>

        {/* Pestañas: HU41 (personas) · HU42 (contenido) */}
        <div className="flex" role="tablist">
          {(
            [
              ['people', 'Personas', userCount],
              ['posts', 'Publicaciones', postCount],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={
                'flex-1 pb-3 pt-1 text-[14px] font-semibold border-b-2 transition-colors ' +
                (tab === id
                  ? 'border-[var(--brand)] text-[var(--ink)]'
                  : 'border-transparent text-[var(--muted)]')
              }
            >
              {label}
              {trimmed ? ` (${count})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Resultados */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {!trimmed ? (
          <div className="px-5 py-6">
            <p className="text-center text-[15px] text-[var(--muted)]">
              Busca compañeros por nombre o carrera, y publicaciones por palabra
              clave.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="px-3.5 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--line)] text-[13px] text-[var(--ink-2)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>

            {isLive && (
              <div className="mt-8 border-t border-[var(--line-soft)] pt-6">
                <h2 className="text-[14px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
                  Explorar publicaciones recientes
                </h2>
                <LivePostList
                  query={liveExploreQuery}
                  empty={
                    <p className="text-center text-[14px] text-[var(--muted)] py-6">
                      No hay publicaciones recientes para explorar.
                    </p>
                  }
                  scrollRootRef={scrollContainerRef}
                />
              </div>
            )}
          </div>
        ) : isLive && trimmed.length >= 2 ? (
          tab === 'people' ? (
            liveUsersQuery.isPending ? (
              <div className="px-5 py-10 text-center text-[var(--muted)] text-[15px]">
                Buscando personas...
              </div>
            ) : liveUserItems.length === 0 ? (
              <div className="px-5 py-16 text-center text-[var(--muted)] text-[15px]">
                No encontramos personas para “{trimmed}”.
              </div>
            ) : (
              <>
                {liveUserItems.map((u) => (
                  <UserRow
                    key={u.id}
                    user={{
                      id: u.id,
                      name: u.displayName,
                      handle: u.handle,
                      career: u.careerName,
                      avatar: u.avatarUrl,
                    }}
                    follow={{
                      followStatus: u.followStatus,
                      canFollow: u.canFollow,
                    }}
                  />
                ))}
                <InfiniteListFooter
                  scrollRootRef={scrollContainerRef}
                  hasNextPage={liveUsersQuery.hasNextPage}
                  isFetchingNextPage={liveUsersQuery.isFetchingNextPage}
                  errorMessage={
                    liveUsersQuery.isFetchNextPageError
                      ? userMessageOf(liveUsersQuery.error)
                      : null
                  }
                  onLoadMore={() => void liveUsersQuery.fetchNextPage()}
                />
              </>
            )
          ) : (
            <LivePostList
              query={livePostsQuery}
              empty={
                <div className="px-5 py-16 text-center text-[var(--muted)] text-[15px]">
                  No encontramos publicaciones para “{trimmed}”.
                </div>
              }
              scrollRootRef={scrollContainerRef}
            />
          )
        ) : (tab === 'people' ? localUserResults : localPostResults).length ===
          0 ? (
          <div className="px-5 py-16 text-center text-[var(--muted)] text-[15px]">
            No encontramos {tab === 'people' ? 'personas' : 'publicaciones'}{' '}
            para “{trimmed}”.
          </div>
        ) : tab === 'people' ? (
          localUserResults.map((u) => <UserRow key={u.id} user={u} />)
        ) : (
          <div className="border-t border-[var(--line-soft)]">
            {localPostResults.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
