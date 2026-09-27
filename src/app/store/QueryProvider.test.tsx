import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/http';
import { QueryProvider, shouldRetry } from './QueryProvider';
import { SessionProvider, useSession } from './SessionStore';
import { signIn } from '../../test/api';

// Caché de TanStack Query (spec 0005).
describe('shouldRetry', () => {
  it.each([400, 401, 403, 404, 429])(
    'nunca reintenta un %i (la sesión o la petición no van a cambiar solas)',
    (status) => {
      expect(shouldRetry(0, new ApiError(status, 'X', 'x'))).toBe(false);
    },
  );

  it('reintenta la red caída y los 5xx hasta 2 veces', () => {
    const network = new ApiError(0, 'NETWORK_ERROR', 'x');
    const server = new ApiError(503, 'UNAVAILABLE', 'x');
    for (const error of [network, server, new Error('x')]) {
      expect(shouldRetry(0, error)).toBe(true);
      expect(shouldRetry(1, error)).toBe(true);
      expect(shouldRetry(2, error)).toBe(false);
    }
  });
});

const FEED_KEY = ['posts', 'feed', null];

/** Entrega el cliente a la prueba y deja cerrar sesión desde ella. */
function Probe({ onClient }: { onClient: (client: QueryClient) => void }) {
  const client = useQueryClient();
  onClient(client);
  const { status, logout } = useSession();
  return (
    <div>
      <p data-testid="status">{status}</p>
      <button onClick={() => void logout()}>salir</button>
    </div>
  );
}

describe('QueryProvider', () => {
  it('AC-4: al cerrar sesión vacía la caché para no mostrarle datos a otra cuenta', async () => {
    const user = userEvent.setup();
    signIn((url) =>
      url.pathname.endsWith('/auth/logout')
        ? new Response(null, { status: 204 })
        : undefined,
    );
    const clients: QueryClient[] = [];
    render(
      <SessionProvider>
        <QueryProvider>
          <Probe onClient={(client) => clients.push(client)} />
        </QueryProvider>
      </SessionProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    );

    const client = clients[0];
    client.setQueryData(FEED_KEY, 'de ana');
    expect(client.getQueryData(FEED_KEY)).toBe('de ana');

    await user.click(screen.getByRole('button', { name: 'salir' }));
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('anonymous'),
    );
    await waitFor(() => expect(client.getQueryData(FEED_KEY)).toBeUndefined());
    // Es el mismo cliente de antes: se vació, no se reemplazó.
    expect(new Set(clients).size).toBe(1);
  });
});
