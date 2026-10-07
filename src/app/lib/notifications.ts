/**
 * Reglas puras de la pantalla de notificaciones (HU39): qué dice cada aviso
 * y a dónde lleva al tocarlo.
 */
import type {
  NotificationKind,
  NotificationPage,
  NotificationView,
} from './notifications-api';

const ACTION: Readonly<Record<NotificationKind, string>> = {
  POST_REACTION: 'reaccionó a tu publicación',
  POST_COMMENT: 'comentó tu publicación',
  STORY_REACTION: 'reaccionó a tu historia',
  STORY_COMMENT: 'comentó tu historia',
  FOLLOW: 'empezó a seguirte',
  FOLLOW_REQUEST: 'quiere seguirte',
  FOLLOW_ACCEPTED: 'aceptó tu solicitud para seguirle',
  MESSAGE: 'te envió un mensaje',
  VERIFICATION_RESULT: 'Revisamos la verificación de tu cuenta',
};

/** Lo que se hizo, sin el nombre de quien lo hizo. */
export function notificationAction(n: NotificationView): string {
  return ACTION[n.type];
}

/** Frase completa, para lectores de pantalla. */
export function notificationText(n: NotificationView): string {
  return n.actor ? `${n.actor.displayName} ${ACTION[n.type]}` : ACTION[n.type];
}

/** Ruta de la web a la que lleva cada aviso. */
export function notificationLink(n: NotificationView): string {
  switch (n.type) {
    case 'MESSAGE':
      return n.conversationId ? `/messages/${n.conversationId}` : '/messages';
    case 'STORY_REACTION':
    case 'STORY_COMMENT':
      return n.storyId ? `/stories/${n.storyId}` : '/profile';
    case 'POST_REACTION':
    case 'POST_COMMENT':
      return '/profile';
    case 'VERIFICATION_RESULT':
      return '/settings';
    default:
      return n.actor ? `/u/${n.actor.id}` : '/notifications';
  }
}

/** Todas las páginas en una sola lista, del más reciente al más antiguo. */
export function flattenNotifications(
  pages: readonly NotificationPage[],
): NotificationView[] {
  return pages.flatMap((p) => p.items);
}

/** El conteo del ícono: hasta 9, después "9+". */
export function badgeText(count: number): string {
  return count > 9 ? '9+' : String(count);
}
