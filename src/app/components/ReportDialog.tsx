import { useState } from 'react';
import { X } from 'lucide-react';
import { REPORT_REASONS } from '../store/AppState';

/**
 * DEF-12 · HU55/HU56 — Diálogo de denuncia.
 *
 * Reportar exige elegir un motivo: una denuncia sin motivo no le sirve a quien
 * después la revisa (FT10). Lo comparten el reporte de usuarios y el de
 * publicaciones para que ambos pidan lo mismo.
 */
export function ReportDialog({
  title,
  subject,
  onConfirm,
  onClose,
}: {
  title: string;
  subject: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<string>('');

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-[var(--surface)] w-full max-w-[330px] p-5 rounded-3xl shadow-2xl">
        <div className="flex items-start justify-between mb-1">
          <h2 className="text-[17px] font-semibold text-[var(--ink)] font-['Space Grotesk',sans-serif]">
            {title}
          </h2>
          <button onClick={onClose} aria-label="Cerrar">
            <X className="w-5 h-5 text-[var(--muted)]" />
          </button>
        </div>
        <p className="text-[13px] text-[var(--muted)] mb-4">{subject}</p>

        <fieldset className="flex flex-col gap-1 mb-5">
          <legend className="sr-only">Motivo de la denuncia</legend>
          {REPORT_REASONS.map((r) => (
            <label
              key={r}
              className="flex items-center gap-3 px-1 py-2 text-[14px] text-[var(--ink)] cursor-pointer"
            >
              <input
                type="radio"
                name="report-reason"
                value={r}
                checked={reason === r}
                onChange={() => setReason(r)}
                className="accent-[var(--brand)] w-4 h-4"
              />
              {r}
            </label>
          ))}
        </fieldset>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full text-[14px] font-semibold text-[var(--muted)] bg-[var(--surface-3)] hover:bg-[var(--surface-3)] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => reason && onConfirm(reason)}
            disabled={!reason}
            className="flex-1 py-2.5 rounded-full text-[14px] font-semibold text-[var(--on-brand)] bg-[var(--brand)] hover:bg-[var(--brand-strong)] transition-colors disabled:opacity-40"
          >
            Enviar denuncia
          </button>
        </div>
      </div>
    </div>
  );
}
