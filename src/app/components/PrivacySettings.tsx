import type React from 'react';
import { Globe, Users, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { userMessageOf } from '../lib/http';
import type { ProfileVisibility } from '../lib/profiles-api';
import { usePrivacy, useUpdatePrivacy } from '../store/profiles-queries';

/**
 * HU07: privacidad de la cuenta contra la API (decisión 15). Lo que se elige
 * aquí lo aplica la API en el perfil, el feed y las historias.
 */
const VISIBILITY_OPTIONS: readonly {
  value: ProfileVisibility;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  {
    value: 'PUBLIC',
    label: 'Público',
    desc: 'Cualquier estudiante ve tu perfil, publicaciones e historias, y puede seguirte al instante.',
    icon: Globe,
  },
  {
    value: 'FOLLOWERS',
    label: 'Solo seguidores',
    desc: 'Quien no te sigue ve un perfil limitado. Para seguirte, te envía una solicitud.',
    icon: Users,
  },
  {
    value: 'PRIVATE',
    label: 'Privado',
    desc: 'Solo tú ves tu contenido. Los demás ven un perfil limitado y no pueden seguirte.',
    icon: Lock,
  },
];

export function PrivacySettings({
  sectionTitle,
  card,
}: {
  sectionTitle: string;
  card: string;
}) {
  const privacy = usePrivacy();
  const update = useUpdatePrivacy();
  // Mientras se guarda, la opción elegida ya se ve marcada.
  const current = update.isPending
    ? update.variables
    : privacy.data?.visibility;

  const choose = (visibility: ProfileVisibility) => {
    if (visibility === current || update.isPending) return;
    update.mutate(visibility, {
      onSuccess: () => toast.success('Privacidad actualizada'),
      onError: (error) => toast.error(userMessageOf(error)),
    });
  };

  return (
    <section aria-busy={privacy.isPending || update.isPending}>
      <h2 className={sectionTitle}>Privacidad del perfil</h2>
      {privacy.isError ? (
        <div className={`${card} px-4 py-5 flex flex-col items-center gap-3`}>
          <p className="text-[14px] text-[var(--ink)] text-center">
            {userMessageOf(privacy.error)}
          </p>
          <button
            onClick={() => void privacy.refetch()}
            className="px-5 py-2 rounded-full text-[13px] font-semibold text-[var(--on-brand)] bg-[var(--brand)] hover:bg-[var(--brand-strong)] transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className={card}>
          {VISIBILITY_OPTIONS.map((opt, i) => {
            const Icon = opt.icon;
            const active = current === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => choose(opt.value)}
                disabled={privacy.isPending}
                aria-pressed={active}
                className={`w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-[var(--surface-2)] transition-colors disabled:opacity-60 ${i > 0 ? 'border-t border-[var(--line-soft)]' : ''}`}
              >
                <Icon
                  className={`w-5 h-5 flex-none ${active ? 'text-[var(--brand)]' : 'text-[var(--muted)]'}`}
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-[15px] text-[var(--ink)] ${active ? 'font-semibold' : ''}`}
                  >
                    {opt.label}
                  </p>
                  <p className="text-[12px] text-[var(--muted)] leading-snug">
                    {opt.desc}
                  </p>
                </div>
                <span
                  className={`w-5 h-5 rounded-full flex-none flex items-center justify-center border-2 ${active ? 'border-[var(--brand)]' : 'border-[var(--line)]'}`}
                  aria-hidden="true"
                >
                  {active && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand)]" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
