import React from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, LogOut, Ban, Moon, Sun } from 'lucide-react';
import { useAppState, Theme } from '../store/AppState';
import { useSession } from '../store/SessionStore';
import { useBlockedUsers, useUnblockUser } from '../store/blocks-queries';
import { AccountInfo } from './AccountInfo';
import { DeactivateAccount } from './DeactivateAccount';
import { LegalLinks } from './LegalLinks';
import { NotificationSettings } from './NotificationSettings';
import { PrivacySettings } from './PrivacySettings';

/**
 * DEF-03 — Configuración de cuenta. Acceso desde el ícono ⚙️ del perfil.
 *   HU06 Ver configuración · HU07 Privacidad del perfil · HU08 Preferencias de notificaciones
 *
 * Aloja además las cuentas bloqueadas (DEF-12 · HU54): al bloquear, la persona
 * desaparece del directorio, así que este es el único sitio desde donde se
 * puede revertir sin recordar su enlace.
 */

/** Apariencia. El oscuro es el predeterminado; el claro está a un toque. */
const THEME_OPTIONS: {
  value: Theme;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  {
    value: 'dark',
    label: 'Oscuro',
    desc: 'El modo con el que arranca Cafeta. Descansa la vista de noche.',
    icon: Moon,
  },
  {
    value: 'light',
    label: 'Claro',
    desc: 'Fondo claro, útil con mucha luz alrededor.',
    icon: Sun,
  },
];

export function SettingsScreen() {
  const navigate = useNavigate();
  const { user: sessionUser, logout } = useSession();
  const { settings, updateSettings, users, blockedIds, unblockUser } =
    useAppState();

  const apiBlocked = useBlockedUsers();
  const unblockMutation = useUnblockUser();

  const isLive = Boolean(sessionUser);
  const blockedUsers =
    isLive && apiBlocked.data
      ? apiBlocked.data.items.map((b) => ({
          id: b.id,
          name: b.displayName,
          handle: `@${b.handle.replace(/^@/, '')}`,
        }))
      : users
          .filter((u) => blockedIds.includes(u.id))
          .map((u) => ({ id: u.id, name: u.name, handle: u.handle }));

  const handleUnblock = (userId: string) => {
    if (isLive) {
      unblockMutation.mutate(userId);
    }
    unblockUser(userId);
  };

  const setTheme = (theme: Theme) => updateSettings({ theme });

  const sectionTitle =
    "text-[12px] font-semibold text-[var(--muted)] uppercase tracking-wider font-['IBM_Plex_Mono',monospace] mb-3 px-1";
  const card =
    'bg-[var(--surface)] rounded-[18px] border border-[var(--line)] overflow-hidden';

  return (
    <div className="w-full h-full bg-[var(--app-bg)] flex flex-col">
      {/* Header */}
      <div className="h-[60px] flex items-center gap-3 px-4 border-b border-[var(--line)] bg-[var(--surface)] mt-12 flex-none">
        <button
          onClick={() => navigate('/profile')}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--surface-3)] transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="w-6 h-6 text-[var(--ink)]" />
        </button>
        <h1 className="text-[17px] font-semibold text-[var(--ink)] font-['Space_Grotesk',sans-serif]">
          Configuración
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-7">
        {/* HU06 — Cuenta: datos de la sesión real */}
        <AccountInfo
          user={sessionUser}
          sectionTitle={sectionTitle}
          card={card}
        />

        {/* HU07 — Privacidad, contra la API (decisión 15) */}
        <PrivacySettings sectionTitle={sectionTitle} card={card} />

        {/* Apariencia */}
        <section>
          <h2 className={sectionTitle}>Apariencia</h2>
          <div className={card}>
            {THEME_OPTIONS.map((opt, i) => {
              const Icon = opt.icon;
              const active = settings.theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  aria-pressed={active}
                  className={`w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-[var(--surface-2)] transition-colors ${i > 0 ? 'border-t border-[var(--line-soft)]' : ''}`}
                >
                  <Icon
                    className={`w-5 h-5 flex-none ${active ? 'text-[var(--brand)]' : 'text-[var(--muted)]'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[15px] ${active ? 'font-semibold text-[var(--ink)]' : 'text-[var(--ink)]'}`}
                    >
                      {opt.label}
                    </p>
                    <p className="text-[12px] text-[var(--muted)] leading-snug">
                      {opt.desc}
                    </p>
                  </div>
                  <span
                    className={`w-5 h-5 rounded-full flex-none flex items-center justify-center border-2 ${active ? 'border-[var(--brand)]' : 'border-[var(--line)]'}`}
                  >
                    {active && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand)]" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* HU08 — Notificaciones, contra la API (decisión 27) */}
        <NotificationSettings sectionTitle={sectionTitle} card={card} />

        {/* HU54 — Cuentas bloqueadas */}
        <section>
          <h2 className={sectionTitle}>Cuentas bloqueadas</h2>
          <div className={card}>
            {blockedUsers.length === 0 ? (
              <p className="px-4 py-4 text-[13px] text-[var(--muted)] leading-snug">
                No has bloqueado a nadie. Puedes bloquear a alguien desde su
                perfil o desde una de sus publicaciones.
              </p>
            ) : (
              blockedUsers.map((u, i) => (
                <div
                  key={u.id}
                  className={`flex items-center gap-3 px-4 py-3.5 ${i > 0 ? 'border-t border-[var(--line-soft)]' : ''}`}
                >
                  <Ban className="w-5 h-5 text-[var(--muted)] flex-none" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] text-[var(--ink)] truncate">
                      {u.name}
                    </p>
                    <p className="text-[12px] text-[var(--muted)] truncate">
                      {u.handle}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUnblock(u.id)}
                    aria-label={`Desbloquear a ${u.name}`}
                    className="h-[32px] px-4 rounded-full text-[13px] font-semibold text-[var(--brand)] border-2 border-[var(--line)] hover:bg-[var(--tint)] transition-colors flex-none"
                  >
                    Desbloquear
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Textos legales (decisión 12) */}
        <LegalLinks sectionTitle={sectionTitle} card={card} />

        {/* Cerrar sesión (HU04): revoca la sesión en la API y vuelve al login */}
        <button
          onClick={() => {
            void logout().finally(() => navigate('/login', { replace: true }));
          }}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-[18px] border border-[var(--line)] bg-[var(--surface)] text-[var(--brand)] font-semibold text-[15px] hover:bg-[var(--tint)] transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Cerrar sesión
        </button>

        {/* HU05 — Desactivar cuenta, con contraseña (decisión 11) */}
        <DeactivateAccount sectionTitle={sectionTitle} card={card} />

        <div className="h-6" />
      </div>
    </div>
  );
}
