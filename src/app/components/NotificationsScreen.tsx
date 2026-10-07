import { useRef } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Bell, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { userMessageOf } from '../lib/http';
import { initialsOf } from '../lib/messages';
import type { NotificationView } from '../lib/notifications-api';
import {
  flattenNotifications,
  notificationAction,
  notificationLink,
  notificationText,
} from '../lib/notifications';
import { relativeTime } from '../lib/posts';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '../store/notifications-queries';
import { InfiniteListFooter } from './InfiniteListFooter';

/**
 * Notificaciones (HU39, spec 0008 decisión 27). Lista real de la API, del más
 * reciente al más antiguo, con las no leídas resaltadas. Los avisos nuevos
 * llegan por el socket (RealtimeProvider), que refresca esta lista y el punto
 * del ícono. Tocar uno lo marca como leído y lleva a lo que lo generó.
 */
export function NotificationsScreen() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const items = flattenNotifications(notifications.data?.pages ?? []);
  const hasUnread = items.some((n) => !n.read);
  const now = new Date();
  // Se calcula aquí: dentro de la rama isSuccess, TypeScript estrecha error a never.
  const nextPageError = notifications.isFetchNextPageError
    ? userMessageOf(notifications.error)
    : null;

  const open = (n: NotificationView) => {
    if (!n.read) markRead.mutate(n.id);
    navigate(notificationLink(n));
  };

  const readAll = () =>
    markAll.mutate(undefined, {
      onError: (error) => toast.error(userMessageOf(error)),
    });

  return (
    <div className="w-full h-full bg-[var(--app-bg)] flex flex-col pb-[100px]">
      <div className="bg-[var(--surface)] border-b border-[var(--line-soft)] px-5 py-4 pt-16 flex items-center gap-3">
        <button
          onClick={() => navigate('/home')}
          className="text-[var(--brand)]"
          aria-label="Volver al inicio"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 font-['Space Grotesk',sans-serif] font-bold text-[24px] text-[var(--ink)]">
          Notificaciones
        </h1>
        {hasUnread && (
          <button
            onClick={readAll}
            disabled={markAll.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold text-[var(--ink)] bg-[var(--surface-3)] disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" aria-hidden="true" />
            Marcar todas como leídas
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {notifications.isPending && <NotificationsSkeleton />}

        {notifications.isError && !notifications.isFetchNextPageError && (
          <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
            <p className="text-[14px] text-[var(--muted)]">
              {userMessageOf(notifications.error)}
            </p>
            <button
              onClick={() => void notifications.refetch()}
              className="px-4 py-2 rounded-full text-[13px] font-semibold text-[var(--ink)] bg-[var(--surface-3)]"
            >
              Reintentar
            </button>
          </div>
        )}

        {notifications.isSuccess && items.length === 0 && (
          <div className="px-8 py-14 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--surface-3)] flex items-center justify-center">
              <Bell className="w-7 h-7 text-[var(--muted)]" />
            </div>
            <h2 className="font-semibold text-[16px] text-[var(--ink)]">
              No tienes notificaciones
            </h2>
            <p className="text-[14px] text-[var(--muted)]">
              Aquí verás las reacciones, comentarios, mensajes y seguidores
              nuevos.
            </p>
          </div>
        )}

        {notifications.isSuccess && items.length > 0 && (
          <>
            <ul aria-label="Notificaciones">
              {items.map((n) => (
                <li key={n.id}>
                  <NotificationRow
                    notification={n}
                    now={now}
                    onOpen={() => open(n)}
                  />
                </li>
              ))}
            </ul>
            <InfiniteListFooter
              scrollRootRef={scrollRef}
              hasNextPage={notifications.hasNextPage}
              isFetchingNextPage={notifications.isFetchingNextPage}
              errorMessage={nextPageError}
              onLoadMore={() => void notifications.fetchNextPage()}
            />
          </>
        )}
      </div>
    </div>
  );
}

function NotificationRow({
  notification,
  now,
  onOpen,
}: {
  notification: NotificationView;
  now: Date;
  onOpen: () => void;
}) {
  const { actor, read } = notification;
  return (
    <button
      onClick={onOpen}
      aria-label={`${notificationText(notification)}${read ? '' : ', sin leer'}`}
      className={`w-full px-5 py-4 flex items-center gap-3 text-left transition-colors border-b border-[var(--line-soft)] hover:bg-[var(--surface)] ${read ? '' : 'bg-[var(--surface)]'}`}
    >
      <div className="w-[44px] h-[44px] flex-shrink-0 rounded-full bg-[var(--brand)] flex items-center justify-center text-[var(--on-brand)] font-semibold text-[15px] shadow-sm">
        {actor ? (
          initialsOf(actor.displayName)
        ) : (
          <Bell className="w-5 h-5" aria-hidden="true" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-[14px] leading-snug ${read ? 'text-[var(--muted)]' : 'text-[var(--ink)]'}`}
        >
          {actor && (
            <span className="font-semibold text-[var(--ink)]">
              {actor.displayName}{' '}
            </span>
          )}
          {notificationAction(notification)}
        </p>
        <span className="text-[12px] text-[var(--muted)]">
          {relativeTime(notification.createdAt, now)}
        </span>
      </div>
      {!read && (
        <span
          data-testid="unread-dot"
          className="flex-shrink-0 w-2.5 h-2.5 bg-[var(--brand)] rounded-full"
        />
      )}
    </button>
  );
}

function NotificationsSkeleton() {
  return (
    <div role="status" aria-label="Cargando notificaciones">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="px-5 py-4 flex items-center gap-3 border-b border-[var(--line-soft)]"
        >
          <div className="w-[44px] h-[44px] rounded-full bg-[var(--surface-3)] animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/4 rounded bg-[var(--surface-3)] animate-pulse" />
            <div className="h-3 w-1/4 rounded bg-[var(--surface-3)] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
