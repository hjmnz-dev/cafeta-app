import { useState } from 'react';
import { Search } from 'lucide-react';
import { useAppState } from '../store/AppState';
import { searchUsers } from '../lib/search';
import { UserRow } from './UserRow';
import { useSession } from '../store/SessionStore';
import { useSearchUsers } from '../store/search-queries';

/**
 * Descubrir personas — directorio de usuarios con seguir en línea (DEF-05).
 * Punto de entrada a los perfiles de terceros (/u/:id). El buscador de aquí
 * filtra el directorio; la búsqueda global de personas y contenido (HU41/HU42)
 * vive en /search (DEF-07) y comparte el mismo motor de coincidencias.
 */
export function PeopleScreen() {
  const { user } = useSession();
  const { users, profile, followingIds, isBlocked } = useAppState();
  const [query, setQuery] = useState('');

  const trimmed = query.trim();
  const isLive = Boolean(user) && trimmed.length >= 2;
  const liveQuery = useSearchUsers(query, Boolean(user));

  // Los bloqueados no aparecen en el directorio (HU53); se gestionan desde
  // Configuración → Cuentas bloqueadas.
  const directory = users.filter((u) => !isBlocked(u.id));
  const localResults = trimmed ? searchUsers(directory, query) : directory;

  const liveItems = liveQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const isEmpty = isLive
    ? !liveQuery.isPending && liveItems.length === 0
    : localResults.length === 0;

  return (
    <div className="w-full h-full bg-[var(--app-bg)] flex flex-col pb-[100px]">
      {/* Header */}
      <div className="bg-[var(--surface)] border-b border-[var(--line)] px-5 py-4 pt-16">
        <h1 className="font-['Space_Grotesk',sans-serif] font-bold text-[24px] text-[var(--ink)] mb-4">
          Descubrir
        </h1>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Buscar personas por nombre o carrera..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[var(--surface-3)] rounded-[16px] border border-[var(--line)] text-[15px] text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--brand)] transition-all"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty && (
          <div className="px-5 py-16 text-center text-[var(--muted)] text-[15px]">
            No encontramos personas para “{query}”.
          </div>
        )}

        {isLive
          ? liveItems.map((u) => (
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
            ))
          : localResults.map((u) => <UserRow key={u.id} user={u} />)}

        <p className="px-5 py-6 text-center text-[12px] text-[var(--muted)] font-['DM_Sans',sans-serif]">
          Sigues a {followingIds.length}{' '}
          {followingIds.length === 1 ? 'persona' : 'personas'} · conectado como{' '}
          {user?.profile.displayName ?? profile.name}
        </p>
      </div>
    </div>
  );
}
