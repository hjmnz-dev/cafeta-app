import { useState } from 'react';
import { Heart } from 'lucide-react';
import {
  nextReaction,
  optionOf,
  REACTIONS,
  type ReactionType,
} from '../lib/reactions';

/** Cuenta compacta al estilo de una línea de tiempo: 1.2k en vez de 1204. */
function compact(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}k` : String(n);
}

/**
 * HU28 — Reaccionar a una publicación (spec 0009, decisión 20).
 *
 * Tocar el botón abre las cinco expresiones; tocar una la pone o reemplaza mi
 * reacción, y tocar la que ya tengo la quita. Todo se decide aquí con datos que
 * llegan por props: la red y la caché viven en `useReactToPost`.
 */
export function PostReactionButton({
  count,
  mine,
  busy,
  onSelect,
}: {
  count: number;
  /** Mi reacción activa a esta publicación; null si no he reaccionado. */
  mine: ReactionType | null;
  busy: boolean;
  /** El tipo que queda; null cuando se quita. */
  onSelect: (type: ReactionType | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const noun = count === 1 ? 'reacción' : 'reacciones';
  const label = mine
    ? `Tu reacción: ${optionOf(mine).label}. ${count} ${noun}`
    : `Reaccionar. ${count} ${noun}`;

  const choose = (type: ReactionType) => {
    setOpen(false);
    onSelect(nextReaction(mine, type));
  };

  return (
    <div
      className="relative"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-1.5 py-1 rounded-full group"
      >
        {mine ? (
          <span className="text-[17px] leading-none" aria-hidden="true">
            {optionOf(mine).emoji}
          </span>
        ) : (
          <Heart
            className="w-[19px] h-[19px] text-[var(--muted)] group-hover:text-[var(--brand)] transition-colors"
            aria-hidden="true"
          />
        )}
        <span
          className={
            'text-[13px] font-medium ' +
            (mine ? 'text-[var(--brand)]' : 'text-[var(--muted)]')
          }
          aria-hidden="true"
        >
          {compact(count)}
        </span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            role="group"
            aria-label="Elegir reacción"
            className="absolute bottom-full left-0 mb-1 z-50 flex gap-1 p-1.5 rounded-full bg-[var(--surface)] border border-[var(--line)] shadow-[var(--shadow-pop)]"
          >
            {REACTIONS.map((reaction) => (
              <button
                key={reaction.type}
                type="button"
                disabled={busy}
                onClick={() => choose(reaction.type)}
                aria-label={reaction.label}
                aria-pressed={mine === reaction.type}
                className={
                  'w-9 h-9 rounded-full flex items-center justify-center text-[20px] leading-none transition-transform hover:scale-110 disabled:opacity-40 ' +
                  (mine === reaction.type
                    ? 'bg-[var(--tint)] ring-2 ring-[var(--brand)]'
                    : 'hover:bg-[var(--surface-3)]')
                }
              >
                <span aria-hidden="true">{reaction.emoji}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
