import { useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { userMessageOf } from '../lib/http';
import { useSearchUsers } from '../store/search-queries';
import { VerifiedBadge } from './VerifiedBadge';

/**
 * HU33 · Elegir con quién iniciar una conversación sin salir de Mensajes (bug
 * 1019). Busca personas con la misma búsqueda de la API y, al elegir una,
 * `onPick` abre (o reusa) la conversación.
 */
export function NewConversationPanel({
  onPick,
  onClose,
}: {
  onPick: (userId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const results = useSearchUsers(trimmed);
  const people = results.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nueva conversación"
      className="absolute inset-0 z-40 bg-[var(--app-bg)] flex flex-col"
    >
      <div className="bg-[var(--surface)] border-b border-[var(--line-soft)] px-5 pt-16 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onClose}
            aria-label="Cerrar nueva conversación"
            className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-[var(--ink)] hover:bg-[var(--surface-3)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-['Space Grotesk',sans-serif] font-bold text-[20px] text-[var(--ink)]">
            Nueva conversación
          </h2>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
          <input
            type="text"
            autoFocus
            aria-label="Buscar personas para escribirles"
            placeholder="Busca por nombre o usuario..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[var(--app-bg)] rounded-[16px] border border-[var(--line)] text-[15px] text-[var(--ink)] placeholder:text-[var(--muted)] outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {trimmed.length < 2 ? (
          <p className="px-8 py-10 text-center text-[14px] text-[var(--muted)]">
            Escribe al menos 2 letras para buscar a alguien de tu comunidad.
          </p>
        ) : results.isPending ? (
          <p className="px-8 py-10 text-center text-[14px] text-[var(--muted)]">
            Buscando…
          </p>
        ) : results.isError ? (
          <p className="px-8 py-10 text-center text-[14px] text-[var(--muted)]">
            {userMessageOf(results.error)}
          </p>
        ) : people.length === 0 ? (
          <p className="px-8 py-10 text-center text-[14px] text-[var(--muted)]">
            No encontramos personas para “{trimmed}”.
          </p>
        ) : (
          <ul>
            {people.map((person) => (
              <li key={person.id}>
                <button
                  onClick={() => onPick(person.id)}
                  aria-label={`Escribirle a ${person.displayName}`}
                  className="w-full px-5 py-3 flex items-center gap-3 text-left border-b border-[var(--line-soft)] hover:bg-[var(--surface-2)]"
                >
                  {person.avatarUrl ? (
                    <img
                      src={person.avatarUrl}
                      alt=""
                      className="w-[46px] h-[46px] rounded-full object-cover bg-[var(--line)] flex-none"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="w-[46px] h-[46px] rounded-full flex-none bg-[var(--brand)] text-[var(--on-brand)] flex items-center justify-center font-semibold text-[17px]"
                    >
                      {(person.displayName.trim()[0] ?? 'C').toUpperCase()}
                    </span>
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1 font-semibold text-[15px] text-[var(--ink)] truncate">
                      {person.displayName}
                      {person.verified && <VerifiedBadge />}
                    </span>
                    <span className="block text-[13px] text-[var(--muted)] truncate">
                      @{person.handle}
                      {person.careerName ? ` · ${person.careerName}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
