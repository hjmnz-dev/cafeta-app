import { useState } from 'react';

/**
 * Foto de perfil de la API (decisión 13) con la inicial del nombre como
 * respaldo cuando no hay foto o no carga (bug 1072). Es el avatar de toda
 * la app: recibe lo que se dibuja.
 */
export function ProfileAvatar({
  url,
  name,
  size,
  radius = 24,
  className = '',
}: {
  url: string | null | undefined;
  name: string;
  size: number;
  radius?: number;
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initial = (name.trim()[0] ?? 'C').toUpperCase();
  const box = { width: size, height: size, borderRadius: radius };
  return url && url !== failedUrl ? (
    <img
      src={url}
      alt=""
      onError={() => setFailedUrl(url)}
      style={box}
      className={`object-cover bg-[var(--surface-3)] ${className}`}
    />
  ) : (
    <div
      style={box}
      aria-hidden="true"
      className={`bg-[var(--brand)] flex items-center justify-center ${className}`}
    >
      <span
        style={{ fontSize: Math.round(size * 0.4) }}
        className="text-white font-['Space_Grotesk',sans-serif] font-bold"
      >
        {initial}
      </span>
    </div>
  );
}
