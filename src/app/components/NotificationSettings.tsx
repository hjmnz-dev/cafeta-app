import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { userMessageOf } from '../lib/http';
import type { NotificationPreferences } from '../lib/notifications-api';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '../store/notifications-queries';

/**
 * HU08: preferencias de notificaciones contra la API (decisión 27). Apagar un
 * grupo hace que la API deje de crear esos avisos; los demás siguen igual.
 */
const OPTIONS: readonly {
  key: keyof NotificationPreferences;
  label: string;
  desc: string;
}[] = [
  {
    key: 'reactions',
    label: 'Reacciones',
    desc: 'Cuando reaccionan a tus publicaciones.',
  },
  {
    key: 'comments',
    label: 'Comentarios',
    desc: 'Cuando comentan tus publicaciones.',
  },
  {
    key: 'follows',
    label: 'Seguidores',
    desc: 'Cuando alguien te sigue, te pide seguirte o acepta tu solicitud.',
  },
  {
    key: 'messages',
    label: 'Mensajes',
    desc: 'Cuando recibes un mensaje directo.',
  },
  {
    key: 'stories',
    label: 'Historias',
    desc: 'Cuando reaccionan o comentan tus historias.',
  },
];

export function NotificationSettings({
  sectionTitle,
  card,
}: {
  sectionTitle: string;
  card: string;
}) {
  const preferences = useNotificationPreferences();
  const update = useUpdateNotificationPreferences();

  const toggle = (key: keyof NotificationPreferences, value: boolean) =>
    update.mutate(
      { [key]: value },
      {
        onSuccess: () => toast.success('Preferencias guardadas'),
        onError: (error) => toast.error(userMessageOf(error)),
      },
    );

  return (
    <section aria-busy={preferences.isPending || update.isPending}>
      <h2 className={sectionTitle}>Notificaciones</h2>
      {preferences.isError ? (
        <div className={`${card} px-4 py-5 flex flex-col items-center gap-3`}>
          <p className="text-[14px] text-[var(--ink)] text-center">
            {userMessageOf(preferences.error)}
          </p>
          <button
            onClick={() => void preferences.refetch()}
            className="px-5 py-2 rounded-full text-[13px] font-semibold text-[var(--on-brand)] bg-[var(--brand)] hover:bg-[var(--brand-strong)] transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className={card}>
          {OPTIONS.map((opt, i) => (
            <div
              key={opt.key}
              className={`flex items-center gap-3 px-4 py-4 ${i > 0 ? 'border-t border-[var(--line-soft)]' : ''}`}
            >
              <Bell className="w-5 h-5 text-[var(--muted)] flex-none" />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] text-[var(--ink)]">{opt.label}</p>
                <p className="text-[12px] text-[var(--muted)] leading-snug">
                  {opt.desc}
                </p>
              </div>
              <Toggle
                label={opt.label}
                on={preferences.data?.[opt.key] ?? true}
                disabled={preferences.isPending || update.isPending}
                onChange={(v) => toggle(opt.key, v)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Toggle({
  label,
  on,
  disabled,
  onChange,
}: {
  label: string;
  on: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      aria-label={`Notificaciones de ${label.toLowerCase()}`}
      disabled={disabled}
      className={`relative w-[46px] h-[27px] rounded-full transition-colors flex-none disabled:opacity-60 ${on ? 'bg-[var(--brand)]' : 'bg-[var(--line)]'}`}
    >
      <span
        className={`absolute top-[3px] left-[3px] w-[21px] h-[21px] rounded-full bg-[var(--surface)] shadow-sm transition-transform ${on ? 'translate-x-[19px]' : ''}`}
      />
    </button>
  );
}
