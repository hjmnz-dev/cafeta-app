import { Link } from 'react-router';
import { Bell } from 'lucide-react';
import { badgeText } from '../lib/notifications';
import { useUnreadNotifications } from '../store/notifications-queries';

/**
 * Campana del feed (decisión 27): lleva a /notifications y muestra cuántos
 * avisos hay sin leer. El conteo se refresca solo cuando llega un aviso por
 * el socket.
 */
export function NotificationsBell() {
  const unread = useUnreadNotifications();
  const count = unread.data ?? 0;
  return (
    <Link
      to="/notifications"
      aria-label={
        count > 0 ? `Notificaciones, ${count} sin leer` : 'Notificaciones'
      }
      className="relative"
    >
      <Bell className="w-[22px] h-[22px] text-[var(--ink)]" strokeWidth={2} />
      {count > 0 && (
        <span
          data-testid="unread-badge"
          aria-hidden="true"
          className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 bg-[var(--brand)] text-[var(--on-brand)] text-[10px] font-bold leading-[14px] text-center rounded-full border-2 border-[var(--surface)]"
        >
          {badgeText(count)}
        </span>
      )}
    </Link>
  );
}
