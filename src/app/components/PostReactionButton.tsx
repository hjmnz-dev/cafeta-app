import { useRef, useState } from 'react';
import { ChevronUp, Heart } from 'lucide-react';
import {
  nextReaction,
  optionOf,
  REACTIONS,
  tapReaction,
  type ReactionType,
} from '../lib/reactions';

/** Cuenta compacta al estilo de una línea de tiempo: 1.2k en vez de 1204. */
function compact(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}k` : String(n);
}

/** Cuánto hay que mantener pulsado para abrir las demás reacciones. */
export const LONG_PRESS_MS = 450;

/**
 * HU28 — Reaccionar a una publicación (spec 0009, decisión 20; bug 1026).
 *
 * Un toque corto pone ❤️, o quita mi reacción si ya tengo una. Mantener
 * pulsado (o clic derecho) abre las cinco expresiones; con teclado o en
 * escritorio, el botón «Más reacciones» las abre. Tocar una la pone o la
 * reemplaza, y tocar la que ya tengo la quita. La red y la caché viven en
 * `useReactToPost`.
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
  // El temporizador del toque largo y si ya abrió el selector (para que el
  // clic que llega al soltar no reaccione además).
  const pressTimer = useRef<number | null>(null);
  const openedByPress = useRef(false);

  const noun = count === 1 ? 'reacción' : 'reacciones';
  const label = mine
    ? `Quitar tu reacción: ${optionOf(mine).label}. ${count} ${noun}`
    : `Me encanta. ${count} ${noun}`;

  const cancelPress = () => {
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  const startPress = () => {
    openedByPress.current = false;
    cancelPress();
    pressTimer.current = window.setTimeout(() => {
      openedByPress.current = true;
      setOpen(true);
    }, LONG_PRESS_MS);
  };
  const tap = () => {
    cancelPress();
    if (openedByPress.current) {
      openedByPress.current = false;
      return;
    }
    if (!busy) onSelect(tapReaction(mine));
  };
  const choose = (type: ReactionType) => {
    setOpen(false);
    onSelect(nextReaction(mine, type));
  };

  return (
    <div
      className="relative flex items-center"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={tap}
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onContextMenu={(e) => {
          e.preventDefault();
          cancelPress();
          setOpen(true);
        }}
        aria-label={label}
        aria-pressed={mine !== null}
        disabled={busy}
        className="flex items-center gap-1.5 px-1.5 py-1 rounded-full group select-none touch-manipulation disabled:opacity-60"
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Más reacciones"
        aria-haspopup="true"
        aria-expanded={open}
        className="w-6 h-6 -ml-1 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--brand)] hover:bg-[var(--surface-3)] transition-colors"
      >
        <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
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
