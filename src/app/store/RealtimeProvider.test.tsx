import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RealtimeProvider, useNotificationListener } from './RealtimeProvider';
import { SessionProvider } from './SessionStore';
import { signIn } from '../../test/api';
import { API_URL } from '../lib/http';
import { socketUrl } from '../lib/messages';
import { conversationKeys } from '../lib/query-keys';

// Socket simulado: guarda los oyentes para poder disparar eventos.
const socket = vi.hoisted(() => ({
  handlers: new Map<string, (payload: unknown) => void>(),
  on: vi.fn(),
  disconnect: vi.fn(),
  io: { on: vi.fn() },
}));
const ioMock = vi.hoisted(() => vi.fn());

vi.mock('socket.io-client', () => ({ io: ioMock }));

beforeEach(() => {
  socket.handlers.clear();
  socket.on.mockImplementation((event: string, fn: (p: unknown) => void) => {
    socket.handlers.set(event, fn);
  });
  socket.disconnect.mockReset();
  ioMock.mockReset().mockReturnValue(socket);
});

function renderProvider(client: QueryClient) {
  return render(
    <SessionProvider>
      <QueryClientProvider client={client}>
        <RealtimeProvider>
          <p>app</p>
        </RealtimeProvider>
      </QueryClientProvider>
    </SessionProvider>,
  );
}

describe('RealtimeProvider', () => {
  it('sin sesión no abre el socket', () => {
    renderProvider(new QueryClient());
    expect(ioMock).not.toHaveBeenCalled();
  });

  it('con sesión se conecta al origen de la API con el token y vuelca message:new en la caché', async () => {
    signIn();
    const client = new QueryClient();
    const conversationId = 'c1';
    client.setQueryData(conversationKeys.messages(conversationId), {
      pages: [{ items: [], nextCursor: null }],
      pageParams: [null],
    });
    const view = renderProvider(client);

    await waitFor(() => expect(ioMock).toHaveBeenCalledTimes(1));
    const [url, options] = ioMock.mock.calls[0];
    expect(url).toBe(socketUrl(API_URL));
    expect(options).toMatchObject({ auth: { token: 'activo' } });

    socket.handlers.get('message:new')?.({
      id: 'm1',
      conversationId,
      senderId: 'u2',
      content: 'Hola',
      createdAt: '2026-10-06T12:00:00.000Z',
      editedAt: null,
    });
    expect(
      client
        .getQueryData<{ pages: { items: { id: string }[] }[] }>(
          conversationKeys.messages(conversationId),
        )
        ?.pages[0].items.map((m) => m.id),
    ).toEqual(['m1']);

    view.unmount();
    expect(socket.disconnect).toHaveBeenCalled();
  });
});

describe('useNotificationListener (bug 1024)', () => {
  function Listener({
    onNotification,
  }: {
    onNotification: (n: unknown) => void;
  }) {
    useNotificationListener(onNotification);
    return null;
  }

  it('reparte cada aviso del socket a quien escucha, y deja de hacerlo al desmontarse', async () => {
    signIn();
    const heard = vi.fn();
    const view = render(
      <SessionProvider>
        <QueryClientProvider client={new QueryClient()}>
          <RealtimeProvider>
            <Listener onNotification={heard} />
          </RealtimeProvider>
        </QueryClientProvider>
      </SessionProvider>,
    );
    await waitFor(() => expect(ioMock).toHaveBeenCalledTimes(1));

    const aviso = { id: 'n1', type: 'MESSAGE', conversationId: 'c1' };
    socket.handlers.get('notification:new')?.(aviso);
    expect(heard).toHaveBeenCalledWith(aviso);

    view.rerender(
      <SessionProvider>
        <QueryClientProvider client={new QueryClient()}>
          <RealtimeProvider>
            <p>sin oyente</p>
          </RealtimeProvider>
        </QueryClientProvider>
      </SessionProvider>,
    );
    socket.handlers.get('notification:new')?.({ id: 'n2', type: 'FOLLOW' });
    expect(heard).toHaveBeenCalledTimes(1);
  });
});
