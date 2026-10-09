/**
 * Cara de quien publica una historia: su foto si la tiene (enlace de lectura
 * de la API) y, si no, su inicial sobre el color de marca. La comparten la
 * tira, el avatar propio y el visor.
 */
export function StoryAvatar({
  url,
  name,
  className = '',
}: {
  url: string | null;
  name: string;
  className?: string;
}) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`rounded-full object-cover bg-[var(--surface-3)] ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`rounded-full bg-[var(--brand)] text-[var(--on-brand)] flex items-center justify-center font-semibold ${className}`}
    >
      {(name.trim()[0] || 'C').toUpperCase()}
    </span>
  );
}
