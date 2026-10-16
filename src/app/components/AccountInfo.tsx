import { useNavigate } from 'react-router';
import { ChevronRight, User } from 'lucide-react';
import {
  careerNameOf,
  memberSinceLabel,
  verificationLabel,
} from '../lib/account';
import type { CurrentUser } from '../lib/auth-api';
import { useCareers } from '../store/posts-queries';
import { ProfileAvatar } from './ProfileAvatar';

/**
 * HU06: los datos de la cuenta en Configuración, tomados de la sesión real
 * (GET /auth/me) y de la lista de carreras de la API.
 */
export function AccountInfo({
  user,
  sectionTitle,
  card,
}: {
  user: CurrentUser | null;
  sectionTitle: string;
  card: string;
}) {
  const navigate = useNavigate();
  const careers = useCareers();

  const rows = user
    ? [
        { label: 'Correo', value: user.email },
        {
          label: 'Carrera',
          value: careerNameOf(careers.data, user.profile.careerId),
        },
        { label: 'Miembro desde', value: memberSinceLabel(user.createdAt) },
        {
          label: 'Verificación',
          value: verificationLabel(user.verificationStatus),
        },
      ].filter((row): row is { label: string; value: string } =>
        Boolean(row.value),
      )
    : [];

  return (
    <section>
      <h2 className={sectionTitle}>Cuenta</h2>
      <div className={card}>
        {user && (
          <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--line-soft)]">
            <ProfileAvatar
              url={user.profile.avatarUrl}
              name={user.profile.displayName}
              size={44}
              radius={14}
              className="flex-none"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[15px] text-[var(--ink)] truncate">
                {user.profile.displayName}
              </p>
              <p className="text-[13px] text-[var(--muted)] truncate">
                @{user.profile.handle}
              </p>
            </div>
          </div>
        )}
        {rows.length > 0 && (
          <dl>
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-baseline justify-between gap-4 px-4 py-3 border-b border-[var(--line-soft)]"
              >
                <dt className="text-[13px] text-[var(--muted)] flex-none">
                  {row.label}
                </dt>
                <dd className="text-[14px] text-[var(--ink)] text-right truncate">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <button
          onClick={() => navigate('/profile/edit')}
          className="w-full flex items-center gap-3 px-4 py-4 hover:bg-[var(--surface-2)] transition-colors"
        >
          <User className="w-5 h-5 text-[var(--muted)]" />
          <span className="flex-1 text-left text-[15px] text-[var(--ink)]">
            Editar perfil
          </span>
          <ChevronRight className="w-5 h-5 text-[var(--muted)]" />
        </button>
      </div>
    </section>
  );
}
