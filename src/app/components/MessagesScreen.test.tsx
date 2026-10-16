import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { MessagesScreen } from './MessagesScreen';
import { ConversationScreen } from './ConversationScreen';
import { renderWithProviders } from '../../test/utils';
import { signIn, TEST_USER } from '../../test/api';
import { json } from '../../test/setup';
import type { ConversationView, MessageView } from '../lib/conversations-api';
import { applyIncomingMessage } from '../store/conversations-queries';

// Mensajería real (spec 0008, decisión 25) con la API simulada.
const BETO = '01926f00-0000-7000-8000-0000000000b0';
const CONV = '01926f00-0000-7000-8000-0000000000d1';

function conversation(
  overrides: Partial<ConversationView> & { id: string },
): ConversationView {
  return {
    otherUser: {
      id: BETO,
      handle: 'beto',
      displayName: 'Beto Díaz',
      careerName: 'Medicina',
      verified: false,
      avatarUrl: null,
    },
    lastMessage: null,
    unread: false,
    ...overrides,
  };
}

function message(
  overrides: Partial<MessageView> & { id: string },
): MessageView {
  return {
    conversationId: CONV,
    senderId: BETO,
    content: 'Hola',
    createdAt: '2026-10-06T12:00:00.000Z',
    editedAt: null,
    ...overrides,
  };
}

const page = <T,>(items: T[], nextCursor: string | null = null) =>
  json(200, { items, nextCursor });

function Screens() {
  return (
    <Routes>
      <Route path="/messages" element={<MessagesScreen />} />
      <Route
        path="/messages/:conversationId"
        element={<ConversationScreen />}
      />
    </Routes>
  );
}

describe('HU33 — Bandeja de mensajes', () => {
  it('HU33 E1: muestra las conversaciones en el orden de la API y marca las no leídas', async () => {
    signIn((url) => {
      if (url.pathname.endsWith('/conversations')) {
        return page([
          conversation({
            id: 'c1',
            unread: true,
            lastMessage: {
              id: 'm1',
              senderId: BETO,
              content: '¿Vamos a estudiar?',
              createdAt: new Date().toISOString(),
            },
          }),
          conversation({
            id: 'c2',
            otherUser: {
              id: '01926f00-0000-7000-8000-0000000000c3',
              handle: 'carla',
              displayName: 'Carla Peña',
              careerName: null,
              verified: false,
              avatarUrl: null,
            },
            lastMessage: {
              id: 'm2',
              senderId: TEST_USER.id,
              content: 'Nos vemos',
              createdAt: '2026-10-01T12:00:00.000Z',
            },
          }),
        ]);
      }
    });
    renderWithProviders(<MessagesScreen />, { route: '/messages' });

    const rows = await screen.findAllByRole('button', {
      name: /conversación con/i,
    });
    expect(rows.map((r) => r.getAttribute('aria-label'))).toEqual([
      'Conversación con Beto Díaz, sin leer',
      'Conversación con Carla Peña',
    ]);
    expect(screen.getByText('¿Vamos a estudiar?')).toBeInTheDocument();
    expect(screen.getByText('Tú: Nos vemos')).toBeInTheDocument();
    expect(screen.getAllByTestId('unread-dot')).toHaveLength(1);
  });

  it('HU33 E2: sin conversaciones muestra el estado vacío que invita a escribir', async () => {
    signIn((url) =>
      url.pathname.endsWith('/conversations') ? page([]) : undefined,
    );
    renderWithProviders(<MessagesScreen />, { route: '/messages' });

    expect(
      await screen.findByText('Aún no tienes conversaciones'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /iniciar una conversación/i }),
    ).toBeInTheDocument();
  });

  it('bug 1019: desde la bandeja se elige a alguien y se abre la conversación', async () => {
    const fetchMock = signIn((url, init) => {
      if (url.pathname.endsWith('/conversations') && init?.method === 'POST') {
        return json(200, conversation({ id: CONV }));
      }
      if (url.pathname.endsWith('/conversations')) return page([]);
      if (url.pathname.endsWith('/search/users')) {
        return page([
          {
            id: BETO,
            handle: 'beto',
            displayName: 'Beto Díaz',
            avatarUrl: null,
            careerName: 'Medicina',
            verified: true,
            followStatus: 'NONE',
            canFollow: true,
          },
        ]);
      }
      if (url.pathname.endsWith(`/conversations/${CONV}`)) {
        return json(200, conversation({ id: CONV }));
      }
      if (url.pathname.endsWith(`/conversations/${CONV}/messages`)) {
        return page([]);
      }
      if (url.pathname.endsWith(`/conversations/${CONV}/read`)) {
        return new Response(null, { status: 204 });
      }
    });
    const user = userEvent.setup();
    renderWithProviders(<Screens />, { route: '/messages' });

    await user.click(
      await screen.findByRole('button', { name: /iniciar una conversación/i }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Nueva conversación' });
    expect(dialog).toBeInTheDocument();
    await user.type(
      screen.getByRole('textbox', {
        name: /buscar personas para escribirles/i,
      }),
      'beto',
    );
    expect(
      await screen.findByRole('img', { name: 'Cuenta verificada' }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Escribirle a Beto Díaz' }),
    );

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        `/messages/${CONV}`,
      ),
    );
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ userId: BETO });
  });

  it('bug 1019: con conversaciones, el botón del encabezado también abre el selector', async () => {
    signIn((url) =>
      url.pathname.endsWith('/conversations')
        ? page([conversation({ id: 'c1' })])
        : undefined,
    );
    const user = userEvent.setup();
    renderWithProviders(<MessagesScreen />, { route: '/messages' });

    await screen.findByText('Beto Díaz');
    await user.click(
      screen.getByRole('button', { name: 'Nueva conversación' }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Nueva conversación' }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Cerrar nueva conversación' }),
    );
    expect(
      screen.queryByRole('dialog', { name: 'Nueva conversación' }),
    ).not.toBeInTheDocument();
  });

  it('si la bandeja falla, muestra el mensaje traducido y deja reintentar', async () => {
    signIn((url) =>
      url.pathname.endsWith('/conversations')
        ? json(500, { statusCode: 500, code: 'INTERNAL' })
        : undefined,
    );
    renderWithProviders(<MessagesScreen />, { route: '/messages' });
    expect(
      await screen.findByRole('button', { name: /reintentar/i }),
    ).toBeInTheDocument();
  });

  it('?to=<id> abre la conversación con esa persona y salta a ella', async () => {
    const fetchMock = signIn((url, init) => {
      if (url.pathname.endsWith('/conversations') && init?.method === 'POST') {
        return json(200, conversation({ id: CONV }));
      }
      if (url.pathname.endsWith(`/conversations/${CONV}`)) {
        return json(200, conversation({ id: CONV }));
      }
      if (url.pathname.endsWith(`/conversations/${CONV}/messages`)) {
        return page([]);
      }
      if (url.pathname.endsWith(`/conversations/${CONV}/read`)) {
        return new Response(null, { status: 204 });
      }
    });
    renderWithProviders(<Screens />, { route: `/messages?to=${BETO}` });

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        `/messages/${CONV}`,
      ),
    );
    expect(await screen.findByText('Beto Díaz')).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'POST',
    );
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ userId: BETO });
  });
});

describe('HU34, HU35 y HU38 — Ver una conversación y enviar', () => {
  const threadApi = (extra?: Parameters<typeof signIn>[0]) =>
    signIn(async (url, init) => {
      const custom = await extra?.(url, init);
      if (custom) return custom;
      if (url.pathname.endsWith(`/conversations/${CONV}`)) {
        return json(200, conversation({ id: CONV }));
      }
      if (url.pathname.endsWith(`/conversations/${CONV}/messages`)) {
        // La API responde del más reciente al más antiguo.
        return page([
          message({ id: 'm3', senderId: TEST_USER.id, content: 'Dale' }),
          message({ id: 'm2', content: '¿Mañana a las 3?' }),
          message({ id: 'm1', content: 'Hola Carlos' }),
        ]);
      }
      if (url.pathname.endsWith(`/conversations/${CONV}/read`)) {
        return new Response(null, { status: 204 });
      }
    });

  it('HU38 E1: dibuja el historial en orden cronológico y marca la conversación como leída', async () => {
    const fetchMock = threadApi();
    renderWithProviders(<Screens />, { route: `/messages/${CONV}` });

    await screen.findByText('Hola Carlos');
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items[0]).toContain('Hola Carlos');
    expect(items[2]).toContain('Dale');
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([input]) =>
          String(input).endsWith(`/conversations/${CONV}/read`),
        ),
      ).toBe(true),
    );
  });

  it('bug 1074: el nombre del encabezado abre el perfil de la otra persona', async () => {
    const user = userEvent.setup();
    threadApi();
    renderWithProviders(<Screens />, { route: `/messages/${CONV}` });

    await user.click(
      await screen.findByRole('link', { name: 'Ver el perfil de Beto Díaz' }),
    );

    expect(screen.getByTestId('location')).toHaveTextContent(`/u/${BETO}`);
  });

  it('HU34 E1: enviar manda el texto recortado, lo agrega al historial y limpia la caja', async () => {
    const user = userEvent.setup();
    const fetchMock = threadApi((url, init) => {
      if (
        url.pathname.endsWith(`/conversations/${CONV}/messages`) &&
        init?.method === 'POST'
      ) {
        return json(
          201,
          message({
            id: 'm4',
            senderId: TEST_USER.id,
            content: 'Perfecto, allá nos vemos',
          }),
        );
      }
    });
    renderWithProviders(<Screens />, { route: `/messages/${CONV}` });
    await screen.findByText('Hola Carlos');

    const box = screen.getByRole('textbox', { name: /escribe un mensaje/i });
    await user.type(box, '  Perfecto, allá nos vemos  ');
    await user.click(screen.getByRole('button', { name: /enviar mensaje/i }));

    expect(
      await screen.findByText('Perfecto, allá nos vemos'),
    ).toBeInTheDocument();
    expect(box).toHaveValue('');
    const sent = fetchMock.mock.calls.find(
      ([input, init]) =>
        init?.method === 'POST' && String(input).endsWith('/messages'),
    );
    expect(JSON.parse(String(sent?.[1]?.body))).toEqual({
      content: 'Perfecto, allá nos vemos',
    });
  });

  it('HU34 E2: con la caja vacía o solo espacios no se puede enviar', async () => {
    const user = userEvent.setup();
    threadApi();
    renderWithProviders(<Screens />, { route: `/messages/${CONV}` });
    await screen.findByText('Hola Carlos');

    const send = screen.getByRole('button', { name: /enviar mensaje/i });
    expect(send).toBeDisabled();
    await user.type(
      screen.getByRole('textbox', { name: /escribe un mensaje/i }),
      '   ',
    );
    expect(send).toBeDisabled();
  });

  it('HU35 E1: un mensaje que llega por el socket aparece sin recargar', async () => {
    threadApi();
    let client: ReturnType<typeof useQueryClient> | null = null;
    function GrabClient() {
      client = useQueryClient();
      return null;
    }
    renderWithProviders(
      <>
        <GrabClient />
        <Screens />
      </>,
      { route: `/messages/${CONV}` },
    );
    await screen.findByText('Hola Carlos');

    // Lo mismo que hace RealtimeProvider con el evento message:new.
    applyIncomingMessage(
      client!,
      message({ id: 'm9', content: 'Ya llegué a la biblioteca' }),
    );
    expect(
      await screen.findByText('Ya llegué a la biblioteca'),
    ).toBeInTheDocument();
  });

  it('una conversación ajena o inexistente muestra el aviso traducido', async () => {
    signIn((url) =>
      url.pathname.includes(`/conversations/${CONV}`)
        ? json(404, { statusCode: 404, code: 'CONVERSATION_NOT_FOUND' })
        : undefined,
    );
    renderWithProviders(<Screens />, { route: `/messages/${CONV}` });
    expect(
      await screen.findByText('Esta conversación ya no está disponible.'),
    ).toBeInTheDocument();
  });
});

describe('HU36 y HU37 · Editar y desactivar mensajes', () => {
  const threadApi = (extra?: Parameters<typeof signIn>[0]) =>
    signIn(async (url, init) => {
      const custom = await extra?.(url, init);
      if (custom) return custom;
      if (url.pathname.endsWith(`/conversations/${CONV}`)) {
        return json(200, conversation({ id: CONV }));
      }
      if (url.pathname.endsWith(`/conversations/${CONV}/messages`)) {
        return page([
          message({ id: 'm3', senderId: TEST_USER.id, content: 'Dale' }),
          message({ id: 'm2', content: '¿Mañana a las 3?' }),
        ]);
      }
      if (url.pathname.endsWith(`/conversations/${CONV}/read`)) {
        return new Response(null, { status: 204 });
      }
    });

  it('HU36 E1: el autor edita su mensaje, se manda el texto nuevo y queda marcado como editado', async () => {
    const user = userEvent.setup();
    const fetchMock = threadApi((url, init) => {
      if (
        url.pathname.endsWith(`/conversations/${CONV}/messages/m3`) &&
        init?.method === 'PATCH'
      ) {
        return json(
          200,
          message({
            id: 'm3',
            senderId: TEST_USER.id,
            content: 'Dale, nos vemos',
            editedAt: '2026-10-06T12:05:00.000Z',
          }),
        );
      }
    });
    renderWithProviders(<Screens />, { route: `/messages/${CONV}` });
    await screen.findByText('Dale');

    await user.click(screen.getByRole('button', { name: 'Editar mensaje' }));
    const input = screen.getByRole('textbox', { name: 'Editar mensaje' });
    await user.clear(input);
    await user.type(input, 'Dale, nos vemos');
    await user.click(screen.getByRole('button', { name: 'Guardar mensaje' }));

    expect(await screen.findByText('Dale, nos vemos')).toBeInTheDocument();
    const patch = fetchMock.mock.calls.find(
      ([, init]) => init?.method === 'PATCH',
    );
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({
      content: 'Dale, nos vemos',
    });
  });

  it('HU36 E2: el mensaje de la otra persona no ofrece editar', async () => {
    threadApi();
    renderWithProviders(<Screens />, { route: `/messages/${CONV}` });
    await screen.findByText('¿Mañana a las 3?');

    // Solo el mensaje propio ("Dale") trae el botón.
    expect(
      screen.getAllByRole('button', { name: 'Editar mensaje' }),
    ).toHaveLength(1);
  });

  it('HU37 E1: el autor elimina su mensaje tras confirmar y desaparece de la conversación', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const fetchMock = threadApi((url, init) => {
      if (
        url.pathname.endsWith(
          `/conversations/${CONV}/messages/m3/deactivate`,
        ) &&
        init?.method === 'POST'
      ) {
        return new Response(null, { status: 204 });
      }
    });
    renderWithProviders(<Screens />, { route: `/messages/${CONV}` });
    await screen.findByText('Dale');

    await user.click(screen.getByRole('button', { name: 'Eliminar mensaje' }));

    await waitFor(() => expect(screen.queryByText('Dale')).toBeNull());
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).endsWith(`/messages/m3/deactivate`),
      ),
    ).toBe(true);
  });

  it('HU37 E2: el mensaje de la otra persona no ofrece eliminar', async () => {
    threadApi();
    renderWithProviders(<Screens />, { route: `/messages/${CONV}` });
    await screen.findByText('¿Mañana a las 3?');

    expect(
      screen.getAllByRole('button', { name: 'Eliminar mensaje' }),
    ).toHaveLength(1);
  });
});
