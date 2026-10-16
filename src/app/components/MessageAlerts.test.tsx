import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { signIn } from '../../test/api';
import type { NotificationView } from '../lib/notifications-api';
import { RealtimeProvider } from '../store/RealtimeProvider';
import { SessionProvider } from '../store/SessionStore';
import { MessageAlerts } from './MessageAlerts';
import { Toaster } from './ui/sonner';

// HU35 · Bug 1024: un mensaje que llega con la sesión abierta avisa sin tener
// que entrar a Mensajes. El socket se simula para disparar el aviso de la API.
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
  ioMock.mockReset().mockReturnValue(socket);
});

const aviso = (
  overrides: Partial<NotificationView> = {},
): NotificationView => ({
  id: 'n1',
  type: 'MESSAGE',
  actor: {
    id: '01926f00-0000-7000-8000-0000000000b0',
    handle: 'beto',
    displayName: 'Beto Díaz',
  },
  postId: null,
  storyId: null,
  conversationId: 'c1',
  read: false,
  createdAt: '2026-10-16T12:00:00.000Z',
  ...overrides,
});

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

async function renderAt(route: string) {
  signIn();
  render(
    <SessionProvider>
      <QueryClientProvider client={new QueryClient()}>
        <RealtimeProvider>
          <MemoryRouter initialEntries={[route]}>
            <MessageAlerts />
            <Routes>
              <Route path="*" element={<Where />} />
            </Routes>
          </MemoryRouter>
          <Toaster />
        </RealtimeProvider>
      </QueryClientProvider>
    </SessionProvider>,
  );
  await waitFor(() => expect(ioMock).toHaveBeenCalled());
}

const llega = (n: NotificationView) =>
  act(() => socket.handlers.get('notification:new')?.(n));

describe('HU35 · Bug 1024 — aviso de mensaje con la sesión abierta', () => {
  it('estando en Home, un mensaje nuevo avisa y "Ver" abre la conversación', async () => {
    await renderAt('/home');

    llega(aviso());

    expect(
      await screen.findByText('Beto Díaz te envió un mensaje'),
    ).toBeInTheDocument();
    // Clic sin eventos de puntero: el aviso de sonner usa setPointerCapture
    // al deslizarlo, y jsdom no lo trae.
    fireEvent.click(screen.getByRole('button', { name: 'Ver' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/messages/c1');
  });

  it('dentro de esa conversación no avisa: el mensaje ya se ve', async () => {
    await renderAt('/messages/c1');

    llega(aviso());

    await new Promise((r) => setTimeout(r, 50));
    expect(
      screen.queryByText('Beto Díaz te envió un mensaje'),
    ).not.toBeInTheDocument();
  });

  it('otros avisos (seguir, reacciones) no salen como emergentes', async () => {
    await renderAt('/home');

    llega(aviso({ id: 'n2', type: 'FOLLOW', conversationId: null }));

    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByText(/empezó a seguirte/)).not.toBeInTheDocument();
  });
});
