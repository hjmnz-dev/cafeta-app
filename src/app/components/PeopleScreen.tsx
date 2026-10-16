import { useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { userMessageOf } from '../lib/http';
import { matchesOwnAccount } from '../lib/search';
import { useProfile } from '../store/profiles-queries';
import { useSession } from '../store/SessionStore';
import { useDiscoverPeople, useSearchUsers } from '../store/search-queries';
import { InfiniteListFooter } from './InfiniteListFooter';
import { UserRow } from './UserRow';

/**
 * Descubrir personas (DEF-05), todo desde la API (bugs 1031 y 1033). Sin
 * escribir, sugiere estudiantes que aún no sigues, primero los de tu carrera;
 * al escribir, busca igual que /search. Cada lista vacía dice por qué.
 */
export function PeopleScreen() {
  const { user } = useSession();
  const me = useProfile(user?.id ?? '', Boolean(user));
  const [query, setQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const searching = trimmed.length >= 2;
  const suggestions = useDiscoverPeople(!searching);
  const results = useSearchUsers(trimmed, searching);
  const list = searching ? results : suggestions;
  const people = list.data?.pages.flatMap((p) => p.items) ?? [];
  const following = me.data?.counts.following;
  const nextPageError = list.isFetchNextPageError
    ? userMessageOf(list.error)
    : null;

  const message = (text: string, detail?: string) => (
    <div className="px-6 py-14 text-center">
      <p className="text-[15px] text-[var(--ink)]">{text}</p>
      {detail && (
        <p className="mt-2 text-[13px] text-[var(--muted)]">{detail}</p>
      )}
    </div>
  );

  return (
    <div className="w-full h-full bg-[var(--app-bg)] flex flex-col pb-[100px]">
      <div className="bg-[var(--surface)] border-b border-[var(--line)] px-5 py-4 pt-16">
        <h1 className="font-['Space_Grotesk',sans-serif] font-bold text-[24px] text-[var(--ink)] mb-4">
          Descubrir
        </h1>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
          <input
            type="text"
            aria-label="Buscar personas por nombre, usuario o carrera"
            placeholder="Buscar personas por nombre, usuario o carrera..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[var(--surface-3)] rounded-[16px] border border-[var(--line)] text-[15px] text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--brand)] transition-all"
          />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {trimmed.length === 1 ? (
          message('Escribe al menos 2 letras para buscar.')
        ) : list.isPending ? (
          message(searching ? 'Buscando…' : 'Cargando sugerencias…')
        ) : list.isError && people.length === 0 ? (
          <div className="px-6 py-14 flex flex-col items-center gap-3 text-center">
            <p className="text-[14px] text-[var(--muted)]">
              {userMessageOf(list.error)}
            </p>
            <button
              onClick={() => void list.refetch()}
              className="px-4 py-2 rounded-full text-[13px] font-semibold text-[var(--ink)] bg-[var(--surface-3)]"
            >
              Reintentar
            </button>
          </div>
        ) : people.length === 0 ? (
          searching ? (
            message(
              `No encontramos personas para “${trimmed}”.`,
              matchesOwnAccount(trimmed, me.data)
                ? 'Tu propia cuenta no aparece en la búsqueda.'
                : 'Prueba con otro nombre, el usuario (@) o la carrera.',
            )
          ) : (
            message(
              'Por ahora no hay más personas para sugerirte.',
              'Ya sigues a todas las sugeridas. Usa el buscador para encontrar a alguien por nombre, usuario o carrera.',
            )
          )
        ) : (
          <>
            <p className="px-5 pt-4 pb-1 text-[12px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              {searching ? 'Resultados' : 'Sugerencias para ti'}
            </p>
            {people.map((person) => (
              <UserRow key={person.id} user={person} />
            ))}
            <InfiniteListFooter
              scrollRootRef={scrollRef}
              hasNextPage={list.hasNextPage}
              isFetchingNextPage={list.isFetchingNextPage}
              errorMessage={nextPageError}
              onLoadMore={() => void list.fetchNextPage()}
            />
          </>
        )}

        {following !== undefined && (
          <p className="px-5 py-6 text-center text-[12px] text-[var(--muted)]">
            Sigues a {following} {following === 1 ? 'persona' : 'personas'}
          </p>
        )}
      </div>
    </div>
  );
}
