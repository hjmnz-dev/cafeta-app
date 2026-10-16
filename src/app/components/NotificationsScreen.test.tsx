import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationsScreen } from './NotificationsScreen';
import { NotificationsBell } from './NotificationsBell';
import { renderWithProviders } from '../../test/utils';
import { signIn } from '../../test/api';
import { json } from '../../test/setup';
import type { NotificationView } from '../lib/notifications-api';

// Notificaciones reales (spec 0008, decisión 27) con la API simulada.
const ANA = '01926f00-0000-7000-8000-0000000000a1';

function notification(
  overrides: Partial<NotificationView> & Pick<NotificationView, 'id' | 'type'>,
): NotificationView {
  return {
    actor: { id: ANA, handle: 'ana', displayName: 'Ana Díaz', avatarUrl: null },
    postId: null,
    storyId: null,
    conversationId: null,
    read: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const page = (items: NotificationView[], nextCursor: string | null = null) =>
  json(200, { items, nextCursor });

describe('HU39 — Ver notificaciones', () => {
  it('HU39 E1: muestra los avisos en el orden de la API y marca los no leídos', async () => {
    signIn((url) =>
      url.pathname.endsWith('/notifications')
        ? page([
            notification({
              id: 'n1',
              type: 'MESSAGE',
              conversationId: 'c1',
            }),
            notification({ id: 'n2', type: 'FOLLOW', read: true }),
          ])
        : undefined,
    );
    renderWithProviders(<NotificationsScreen />, { route: '/notifications' });

    const list = await screen.findByRole('list', { name: 'Notificaciones' });
    const rows = list.querySelectorAll('button');
    expect([...rows].map((r) => r.getAttribute('aria-label'))).toEqual([
      'Ana Díaz te envió un mensaje, sin leer',
      'Ana Díaz empezó a seguirte',
    ]);
    expect(screen.getAllByTestId('unread-dot')).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: /marcar todas como leídas/i }),
    ).toBeInTheDocument();
  });

  it('HU39 E2: sin avisos muestra el estado vacío, sin indicadores de novedad', async () => {
    signIn((url) =>
      url.pathname.endsWith('/notifications') ? page([]) : undefined,
    );
    renderWithProviders(<NotificationsScreen />, { route: '/notifications' });

    expect(
      await screen.findByText('No tienes notificaciones'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('unread-dot')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /marcar todas/i }),
    ).not.toBeInTheDocument();
  });

  it('tocar un aviso lo marca como leído y lleva a lo que lo generó', async () => {
    const user = userEvent.setup();
    const fetchMock = signIn((url, init) => {
      if (url.pathname.endsWith('/notifications/n1/read')) {
        return new Response(null, { status: 204 });
      }
      if (url.pathname.endsWith('/notifications') && init?.method !== 'POST') {
        return page([
          notification({ id: 'n1', type: 'MESSAGE', conversationId: 'c1' }),
        ]);
      }
      return undefined;
    });
    renderWithProviders(<NotificationsScreen />, { route: '/notifications' });

    await user.click(
      await screen.findByRole('button', { name: /te envió un mensaje/i }),
    );

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/messages/c1'),
    );
    expect(
      fetchMock.mock.calls.some(
        ([input, init]) =>
          String(input).endsWith('/notifications/n1/read') &&
          init?.method === 'POST',
      ),
    ).toBe(true);
  });

  it('"Marcar todas como leídas" llama a la API y vuelve a pedir la lista', async () => {
    const user = userEvent.setup();
    let allRead = false;
    signIn((url, init) => {
      if (url.pathname.endsWith('/notifications/read-all')) {
        allRead = true;
        return new Response(null, { status: 204 });
      }
      if (url.pathname.endsWith('/notifications') && init?.method !== 'POST') {
        return page([
          notification({ id: 'n1', type: 'FOLLOW', read: allRead }),
        ]);
      }
      return undefined;
    });
    renderWithProviders(<NotificationsScreen />, { route: '/notifications' });

    await user.click(
      await screen.findByRole('button', { name: /marcar todas como leídas/i }),
    );

    await waitFor(() =>
      expect(screen.queryByTestId('unread-dot')).not.toBeInTheDocument(),
    );
  });

  it('si la lista falla, muestra el mensaje traducido y deja reintentar', async () => {
    signIn((url) =>
      url.pathname.endsWith('/notifications')
        ? json(500, { statusCode: 500, code: 'INTERNAL' })
        : undefined,
    );
    renderWithProviders(<NotificationsScreen />, { route: '/notifications' });
    expect(
      await screen.findByRole('button', { name: /reintentar/i }),
    ).toBeInTheDocument();
  });
});

describe('Campana de notificaciones', () => {
  it('muestra el conteo de no leídas y lleva a /notifications', async () => {
    const user = userEvent.setup();
    signIn((url) =>
      url.pathname.endsWith('/notifications/unread-count')
        ? json(200, { count: 12 })
        : undefined,
    );
    renderWithProviders(<NotificationsBell />, { route: '/home' });

    const bell = await screen.findByRole('link', {
      name: 'Notificaciones, 12 sin leer',
    });
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('9+');
    await user.click(bell);
    expect(screen.getByTestId('location')).toHaveTextContent('/notifications');
  });

  it('sin avisos nuevos no muestra el punto', async () => {
    signIn((url) =>
      url.pathname.endsWith('/notifications/unread-count')
        ? json(200, { count: 0 })
        : undefined,
    );
    renderWithProviders(<NotificationsBell />, { route: '/home' });

    expect(
      await screen.findByRole('link', { name: 'Notificaciones' }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument();
  });
});

describe('Bug 1066 — Responder una solicitud desde su aviso', () => {
  const request = {
    id: 'f1',
    createdAt: new Date().toISOString(),
    follower: {
      id: ANA,
      handle: 'ana',
      displayName: 'Ana Díaz',
      avatarUrl: null,
      careerName: null,
      verified: false,
    },
  };

  function api(pending: boolean) {
    let answered: string | null = null;
    const fetchMock = signIn((url, init) => {
      const path = url.pathname;
      if (
        path.endsWith('/follows/f1/accept') ||
        path.endsWith('/follows/f1/reject')
      ) {
        answered = path.endsWith('/accept') ? 'accept' : 'reject';
        return new Response(null, { status: 204 });
      }
      if (path.endsWith('/notifications/n1/read')) {
        return new Response(null, { status: 204 });
      }
      if (path.endsWith('/follows/requests')) {
        return json(200, {
          items: pending && answered === null ? [request] : [],
          nextCursor: null,
        });
      }
      if (path.endsWith('/notifications') && init?.method !== 'POST') {
        return page([notification({ id: 'n1', type: 'FOLLOW_REQUEST' })]);
      }
      return undefined;
    });
    return { fetchMock, answer: () => answered };
  }

  it('aceptar desde el aviso acepta la solicitud y lo confirma', async () => {
    const user = userEvent.setup();
    const { answer } = api(true);
    renderWithProviders(<NotificationsScreen />, { route: '/notifications' });

    await user.click(
      await screen.findByRole('button', {
        name: 'Aceptar la solicitud de Ana Díaz',
      }),
    );

    expect(
      await screen.findByText('Aceptaste la solicitud: Ana Díaz ya te sigue.'),
    ).toBeInTheDocument();
    expect(answer()).toBe('accept');
    expect(
      screen.queryByRole('button', { name: /aceptar la solicitud/i }),
    ).not.toBeInTheDocument();
  });

  it('rechazar desde el aviso rechaza la solicitud', async () => {
    const user = userEvent.setup();
    const { answer } = api(true);
    renderWithProviders(<NotificationsScreen />, { route: '/notifications' });

    await user.click(
      await screen.findByRole('button', {
        name: 'Rechazar la solicitud de Ana Díaz',
      }),
    );

    expect(
      await screen.findByText('Rechazaste la solicitud.'),
    ).toBeInTheDocument();
    expect(answer()).toBe('reject');
  });

  it('una solicitud ya respondida no ofrece botones', async () => {
    api(false);
    renderWithProviders(<NotificationsScreen />, { route: '/notifications' });

    expect(
      await screen.findByText('Esta solicitud ya fue respondida.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /aceptar la solicitud/i }),
    ).not.toBeInTheDocument();
  });

  it('las pendientes llevan a la lista de solicitudes', async () => {
    const user = userEvent.setup();
    api(true);
    renderWithProviders(<NotificationsScreen />, { route: '/notifications' });

    await user.click(
      await screen.findByRole('button', {
        name: /1 solicitud de seguimiento pendiente/i,
      }),
    );

    expect(screen.getByTestId('location')).toHaveTextContent('/network');
  });
});
