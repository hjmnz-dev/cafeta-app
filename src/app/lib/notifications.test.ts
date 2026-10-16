import { describe, it, expect } from 'vitest';
import type { NotificationView } from './notifications-api';
import {
  badgeText,
  flattenNotifications,
  messageAlert,
  notificationLink,
  notificationText,
} from './notifications';

const ANA = '01926f00-0000-7000-8000-0000000000a1';

function notification(
  overrides: Partial<NotificationView> & Pick<NotificationView, 'type'>,
): NotificationView {
  return {
    id: 'n1',
    actor: { id: ANA, handle: 'ana', displayName: 'Ana Díaz' },
    postId: null,
    storyId: null,
    conversationId: null,
    read: false,
    createdAt: '2026-10-06T12:00:00.000Z',
    ...overrides,
  };
}

describe('notifications', () => {
  it('nombra a quien actuó y lo que hizo', () => {
    expect(notificationText(notification({ type: 'FOLLOW' }))).toBe(
      'Ana Díaz empezó a seguirte',
    );
    expect(notificationText(notification({ type: 'MESSAGE' }))).toBe(
      'Ana Díaz te envió un mensaje',
    );
    expect(
      notificationText(
        notification({ type: 'VERIFICATION_RESULT', actor: null }),
      ),
    ).toBe('Revisamos la verificación de tu cuenta');
  });

  it('cada aviso lleva a su pantalla', () => {
    expect(
      notificationLink(notification({ type: 'MESSAGE', conversationId: 'c1' })),
    ).toBe('/messages/c1');
    expect(
      notificationLink(notification({ type: 'STORY_COMMENT', storyId: 's1' })),
    ).toBe('/stories/s1');
    expect(notificationLink(notification({ type: 'POST_REACTION' }))).toBe(
      '/profile',
    );
    expect(notificationLink(notification({ type: 'FOLLOW_REQUEST' }))).toBe(
      `/u/${ANA}`,
    );
    expect(
      notificationLink(
        notification({ type: 'VERIFICATION_RESULT', actor: null }),
      ),
    ).toBe('/settings');
  });

  it('junta las páginas en orden y acorta el conteo', () => {
    const a = notification({ type: 'FOLLOW', id: 'a' });
    const b = notification({ type: 'FOLLOW', id: 'b' });
    expect(
      flattenNotifications([
        { items: [a], nextCursor: 'a' },
        { items: [b], nextCursor: null },
      ]).map((n) => n.id),
    ).toEqual(['a', 'b']);
    expect(badgeText(3)).toBe('3');
    expect(badgeText(12)).toBe('9+');
  });
});

describe('messageAlert (bug 1024)', () => {
  const mensaje = notification({ type: 'MESSAGE', conversationId: 'c1' });

  it('un mensaje nuevo avisa quién escribió y lleva a la conversación', () => {
    expect(messageAlert(mensaje, '/home')).toEqual({
      text: 'Ana Díaz te envió un mensaje',
      link: '/messages/c1',
    });
  });

  it('dentro de esa misma conversación no avisa', () => {
    expect(messageAlert(mensaje, '/messages/c1')).toBeNull();
  });

  it('en otra conversación sí avisa', () => {
    expect(messageAlert(mensaje, '/messages/c2')).not.toBeNull();
  });

  it('los demás avisos no salen como emergentes', () => {
    expect(messageAlert(notification({ type: 'FOLLOW' }), '/home')).toBeNull();
  });
});
