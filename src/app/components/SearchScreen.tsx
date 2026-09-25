import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Search, X } from 'lucide-react';
import { useAppState } from '../store/AppState';
import { searchUsers, searchPosts } from '../lib/search';
import { UserRow } from './UserRow';
import { PostCard } from './PostCard';

/**
 * DEF-07 · HU41/HU42 — Búsqueda global de personas y contenido.
 *
 * Una sola caja para las dos historias, separadas en pestañas: escribir una vez
 * y ver si lo que buscabas era una persona o una publicación. El conteo se
 * muestra en ambas pestañas para que un resultado en la otra no pase
 * inadvertido. La coincidencia vive en lib/search (compartida con Descubrir).
 */

type Tab = 'people' | 'posts';

export function SearchScreen() {
  const navigate = useNavigate();
  const { users, posts, isBlocked } = useAppState();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('people');

  const trimmed = query.trim();
  // El contenido de usuarios bloqueados queda fuera de la búsqueda (HU53).
  const userResults = useMemo(
    () => searchUsers(users, query).filter((u) => !isBlocked(u.id)),
    [users, query, isBlocked],
  );
  const postResults = useMemo(
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

  const results = tab === 'people' ? userResults : postResults;
  const noun = tab === 'people' ? 'personas' : 'publicaciones';

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
              ['people', 'Personas', userResults.length],
              ['posts', 'Publicaciones', postResults.length],
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
      <div className="flex-1 overflow-y-auto">
        {!trimmed ? (
          <div className="px-5 py-10">
            <p className="text-center text-[15px] text-[var(--muted)]">
              Busca compañeros por nombre o carrera, y publicaciones por palabra
              clave.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
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
          </div>
        ) : results.length === 0 ? (
          <div className="px-5 py-16 text-center text-[var(--muted)] text-[15px]">
            No encontramos {noun} para “{trimmed}”.
          </div>
        ) : tab === 'people' ? (
          userResults.map((u) => <UserRow key={u.id} user={u} />)
        ) : (
          <div className="border-t border-[var(--line-soft)]">
            {postResults.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
