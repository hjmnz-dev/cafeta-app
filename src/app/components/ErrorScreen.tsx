/**
 * Pantalla de error (spec 0007). Componente puro: no usa el router, así sirve
 * dentro y fuera de él, y trae su propio contenedor porque reemplaza a
 * AppLayout.
 */
import { CafetaMark } from './Logo';

interface ErrorScreenProps {
  variant: 'crash' | 'not-found';
  eventId?: string;
}

export function ErrorScreen({ variant, eventId }: ErrorScreenProps) {
  const title =
    variant === 'crash' ? 'Algo salió mal' : 'No encontramos esta página';
  const detail =
    variant === 'crash'
      ? 'Ocurrió un error inesperado. Puedes recargar la página o volver al inicio.'
      : 'La dirección no existe o ya no está disponible.';

  return (
    <main
      role="alert"
      className="min-h-screen w-full bg-[var(--surface)] flex flex-col items-center justify-center gap-6 px-8 text-center"
    >
      <CafetaMark size={72} />
      <div className="flex flex-col gap-2">
        <h1 className="font-['Space_Grotesk',sans-serif] text-[26px] font-bold text-[var(--ink)] leading-tight">
          {title}
        </h1>
        <p className="text-[var(--muted)] text-[15px] leading-relaxed">
          {detail}
        </p>
        {variant === 'crash' && eventId && (
          <p className="font-['IBM_Plex_Mono',monospace] text-[13px] text-[var(--muted)]">
            Código del error: {eventId.slice(0, 8)}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-3 w-full max-w-[320px]">
        {variant === 'crash' && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full h-12 bg-[var(--brand)] text-[var(--on-brand)] rounded-[16px] font-semibold text-[15px] hover:bg-[var(--brand-strong)] transition-colors"
          >
            Recargar
          </button>
        )}
        <a
          href="/"
          className="w-full h-12 flex items-center justify-center rounded-[16px] font-semibold text-[15px] text-[var(--brand)] border border-[var(--brand)]"
        >
          Ir al inicio
        </a>
      </div>
    </main>
  );
}
