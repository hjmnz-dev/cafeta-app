import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useAppState } from '../store/AppState';
import { searchUsers } from '../lib/search';
import { UserRow } from './UserRow';

/**
 * Descubrir personas — directorio de usuarios con seguir en línea (DEF-05).
 * Punto de entrada a los perfiles de terceros (/u/:id). El buscador de aquí
 * filtra el directorio; la búsqueda global de personas y contenido (HU41/HU42)
 * vive en /search (DEF-07) y comparte el mismo motor de coincidencias.
 */
export function PeopleScreen() {
  const { users, profile, followingIds, isBlocked } = useAppState();
  const [query, setQuery] = useState('');

  // Los bloqueados no aparecen en el directorio (HU53); se gestionan desde
  // Configuración → Cuentas bloqueadas.
  const directory = users.filter((u) => !isBlocked(u.id));
  const results = query.trim() ? searchUsers(directory, query) : directory;

  return (
    <div className="w-full h-full bg-[var(--app-bg)] flex flex-col pb-[100px]">
      {/* Header */}
      <div className="bg-[var(--surface)] border-b border-[var(--line)] px-5 py-4 pt-16">
        <h1 className="font-['Space_Grotesk',sans-serif] font-bold text-[24px] text-[var(--ink)] mb-4">Descubrir</h1>
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
        {results.length === 0 && (
          <div className="px-5 py-16 text-center text-[var(--muted)] text-[15px]">
            No encontramos personas para “{query}”.
          </div>
        )}

        {results.map((u) => (
          <UserRow key={u.id} user={u} />
        ))}

        <p className="px-5 py-6 text-center text-[12px] text-[var(--muted)] font-['DM_Sans',sans-serif]">
          Sigues a {followingIds.length} {followingIds.length === 1 ? 'persona' : 'personas'} · conectado como {profile.name}
        </p>
      </div>
    </div>
  );
}
