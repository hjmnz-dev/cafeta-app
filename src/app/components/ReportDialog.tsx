import { useState } from 'react';
import { X } from 'lucide-react';
import {
  cleanDetails,
  countChars,
  REPORT_DETAILS_MAX,
  REPORT_REASONS,
  reportBlocker,
} from '../lib/reports';
import type { ReportReason } from '../lib/reports-api';

export interface ReportChoice {
  reason: ReportReason;
  details?: string;
}

/**
 * DEF-12 · HU55/HU56 — Diálogo de denuncia.
 *
 * Reportar exige elegir un motivo: una denuncia sin motivo no le sirve a quien
 * después la revisa (FT10). Con "Otro" también pide contarlo. Lo comparten el
 * reporte de usuarios y el de publicaciones para que ambos pidan lo mismo.
 * Solo dibuja y recoge la elección; enviarla es de `ReportTargetDialog`.
 */
export function ReportDialog({
  title,
  subject,
  pending = false,
  error = null,
  onConfirm,
  onClose,
}: {
  title: string;
  subject: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: (choice: ReportChoice) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');

  const blocker = reportBlocker(reason, details);
  const canSend = blocker === null && !pending;
  const used = countChars(details);

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

        <fieldset className="flex flex-col gap-1 mb-4">
          <legend className="sr-only">Motivo de la denuncia</legend>
          {REPORT_REASONS.map(({ code, label }) => (
            <label
              key={code}
              className="flex items-center gap-3 px-1 py-2 text-[14px] text-[var(--ink)] cursor-pointer"
            >
              <input
                type="radio"
                name="report-reason"
                value={code}
                checked={reason === code}
                onChange={() => setReason(code)}
                className="accent-[var(--brand)] w-4 h-4"
              />
              {label}
            </label>
          ))}
        </fieldset>

        {reason === 'OTHER' && (
          <div className="mb-4">
            <label
              htmlFor="report-details"
              className="block text-[13px] font-medium text-[var(--ink)] mb-1"
            >
              Cuéntanos qué pasó
            </label>
            <textarea
              id="report-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-[14px] text-[var(--ink)] resize-none"
            />
            <p
              className={
                'text-[12px] text-right ' +
                (used > REPORT_DETAILS_MAX
                  ? 'text-[var(--brand)]'
                  : 'text-[var(--muted)]')
              }
              aria-live="polite"
            >
              {used}/{REPORT_DETAILS_MAX}
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="text-[13px] text-[var(--brand)] mb-3">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full text-[14px] font-semibold text-[var(--muted)] bg-[var(--surface-3)] hover:bg-[var(--surface-3)] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() =>
              reason && onConfirm({ reason, details: cleanDetails(details) })
            }
            disabled={!canSend}
            className="flex-1 py-2.5 rounded-full text-[14px] font-semibold text-[var(--on-brand)] bg-[var(--brand)] hover:bg-[var(--brand-strong)] transition-colors disabled:opacity-40"
          >
            {pending ? 'Enviando…' : 'Enviar denuncia'}
          </button>
        </div>
      </div>
    </div>
  );
}
