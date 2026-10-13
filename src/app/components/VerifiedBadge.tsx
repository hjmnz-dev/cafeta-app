import { BadgeCheck } from 'lucide-react';

/**
 * HU50 · Insignia de cuenta verificada por la administración.
 *
 * Una sola pieza para el perfil, las publicaciones y las listas de personas,
 * así la insignia se ve igual en todos lados.
 */
export function VerifiedBadge({
  className = 'w-4 h-4',
}: {
  className?: string;
}) {
  return (
    <BadgeCheck
      role="img"
      aria-label="Cuenta verificada"
      className={`${className} text-[var(--brand)] flex-none`}
    />
  );
}
