import React from 'react';

/**
 * Casilla de verificación de los formularios (login y registro).
 *
 * Dos decisiones detrás de esta forma:
 *
 * - **No es roja.** En la app el rojo es la marca y, sobre todo, el color de los
 *   errores; una casilla roja se lee como "algo va mal" en vez de "activado".
 *   Marcada se rellena con la tinta del tema y el visto va del color de la
 *   superficie, que contrasta en claro y en oscuro. Sin marcar es solo un
 *   contorno, así que los dos estados se distinguen de un vistazo.
 * - **Es una casilla de verdad.** Antes era un `<div>` con `onClick`: no se
 *   podía marcar con el teclado ni la anunciaba un lector de pantalla, y pulsar
 *   sobre el texto no hacía nada. Aquí el `<input>` va oculto pero real, y la
 *   etiqueta envuelve todo.
 */
export function Checkbox({ checked, onChange, error = false, children }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Marca el contorno en rojo cuando el formulario señala esta casilla. */
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={
          'w-5 h-5 mt-0.5 rounded-[6px] border-2 flex items-center justify-center flex-none transition-colors ' +
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--brand)] ' +
          (checked
            ? 'bg-[var(--ink)] border-[var(--ink)]'
            : error
            ? 'bg-transparent border-[var(--brand)]'
            : 'bg-transparent border-[var(--muted)]')
        }
      >
        {checked && (
          <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
            <path
              d="M1 4L4.5 7.5L11 1"
              stroke="var(--surface)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="text-[14px] text-[var(--ink)] font-['DM_Sans',sans-serif] leading-snug">
        {children}
      </span>
    </label>
  );
}
