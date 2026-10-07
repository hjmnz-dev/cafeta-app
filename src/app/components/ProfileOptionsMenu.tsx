import { useState } from 'react';
import { Ban, Check, Flag, MoreHorizontal } from 'lucide-react';
import { useHasReported } from '../store/reports-queries';
import { ReportTargetDialog } from './ReportTargetDialog';

/**
 * Menú "···" del perfil de otra persona: reportar (HU55) y bloquear (HU53). Las
 * demás acciones de moderación del perfil se suman aquí.
 */
export function ProfileOptionsMenu({
  userId,
  displayName,
  handle,
  firstName,
  onBlock,
}: {
  userId: string;
  displayName: string;
  handle: string;
  firstName: string;
  /** Bloquea a la persona; la pantalla decide cómo (API y estado local). */
  onBlock: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const reported = useHasReported('USER', userId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Opciones sobre ${firstName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-[40px] h-[40px] rounded-full border-2 border-[var(--line)] bg-[var(--surface)] flex items-center justify-center text-[var(--ink)] hover:bg-[var(--surface-3)] transition-colors"
      >
        <MoreHorizontal className="w-[18px] h-[18px]" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 top-12 z-50 bg-[var(--surface)] rounded-2xl shadow-[var(--shadow-pop)] border border-[var(--line)] overflow-hidden w-[210px]"
          >
            <button
              role="menuitem"
              onClick={() => {
                setReporting(true);
                setOpen(false);
              }}
              disabled={reported}
              className="w-full px-4 py-3 flex items-center gap-3 text-[14px] text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors disabled:text-[var(--muted)]"
            >
              {reported ? (
                <>
                  <Check className="w-4 h-4 text-[var(--muted)]" /> Usuario
                  reportado
                </>
              ) : (
                <>
                  <Flag className="w-4 h-4 text-[var(--muted)]" /> Reportar
                  usuario
                </>
              )}
            </button>
            <button
              role="menuitem"
              onClick={() => {
                onBlock();
                setOpen(false);
              }}
              className="w-full px-4 py-3 flex items-center gap-3 text-[14px] text-[var(--negative)] hover:bg-[var(--surface-2)] transition-colors border-t border-[var(--line-soft)]"
            >
              <Ban className="w-4 h-4" /> Bloquear usuario
            </button>
          </div>
        </>
      )}

      {reporting && (
        <ReportTargetDialog
          targetType="USER"
          targetId={userId}
          title="Reportar usuario"
          subject={`Perfil de ${displayName} (@${handle})`}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  );
}
