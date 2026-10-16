import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { signIn } from '../../test/api';
import { json } from '../../test/setup';
import { renderWithProviders } from '../../test/utils';
import { AppLayout } from './AppLayout';

// La navegación inferior solo va en las pantallas de la app con sesión; los
// textos legales son públicos y van a pantalla completa (spec 0009, decisión 12).
describe('AppLayout: navegación inferior', () => {
  it.each(['/terms', '/privacy', '/login'])(
    '%s no muestra la navegación inferior',
    (route) => {
      renderWithProviders(<AppLayout />, { route });

      expect(screen.queryByText('Discover')).not.toBeInTheDocument();
    },
  );

  it('una pantalla de la app sí la muestra', () => {
    renderWithProviders(<AppLayout />, { route: '/home' });

    expect(screen.getByText('Discover')).toBeInTheDocument();
  });
});

describe('AppLayout: punto de mensajes sin leer (bug 1024)', () => {
  const inboxWith = (unread: boolean) =>
    signIn((url) =>
      url.pathname.endsWith('/conversations')
        ? json(200, {
            items: [
              {
                id: 'c1',
                otherUser: {
                  id: 'u2',
                  handle: 'beto',
                  displayName: 'Beto Díaz',
                  careerName: null,
                  verified: false,
                },
                lastMessage: null,
                unread,
              },
            ],
            nextCursor: null,
          })
        : undefined,
    );

  it('con una conversación sin leer, «Mensajes» lleva el punto y lo dice', async () => {
    inboxWith(true);
    renderWithProviders(<AppLayout />, { route: '/home' });

    expect(await screen.findByTestId('nav-dot-messages')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Mensajes, tienes mensajes sin leer' }),
    ).toHaveAttribute('href', '/messages');
  });

  it('con todo leído no hay punto', async () => {
    const fetchMock = inboxWith(false);
    renderWithProviders(<AppLayout />, { route: '/home' });

    // Espera a que se pida la bandeja antes de afirmar que no hay punto.
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([input]) =>
          String(input).endsWith('/conversations'),
        ),
      ).toBe(true),
    );
    await screen.findByText('Discover');
    expect(screen.queryByTestId('nav-dot-messages')).not.toBeInTheDocument();
  });
});

describe('AppLayout: la hora de la barra de estado', () => {
  it('muestra la hora local actual, no una fija', () => {
    renderWithProviders(<AppLayout />, { route: '/home' });

    const now = new Date();
    const expected = `${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`;
    expect(screen.getByTestId('status-clock')).toHaveTextContent(expected);
  });
});
