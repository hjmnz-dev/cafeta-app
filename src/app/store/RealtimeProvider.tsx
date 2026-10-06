/**
 * Canal de tiempo real con la API (spec 0008, decisión 25).
 *
 * Abre un solo socket mientras hay sesión, autenticado con el mismo JWT del
 * cliente HTTP, y vuelca cada evento en la caché de TanStack Query. No dibuja
 * nada ni guarda nada a nivel de módulo: el socket vive dentro del efecto y se
 * cierra al cerrar sesión.
 */
import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import type { MessageView } from '../lib/conversations-api';
import { API_URL, readStoredSession } from '../lib/http';
import { socketUrl } from '../lib/messages';
import { conversationKeys } from '../lib/query-keys';
import { applyIncomingMessage } from './conversations-queries';
import { useSession } from './SessionStore';

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (status !== 'authenticated') return;
    const session = readStoredSession();
    if (!session) return;
    const socket = io(socketUrl(API_URL), {
      auth: { token: session.accessToken },
      transports: ['websocket'],
    });
    socket.on('message:new', (message: MessageView) =>
      applyIncomingMessage(queryClient, message),
    );
    // Al reconectar pudo llegar algo mientras no había socket: se vuelve a pedir.
    socket.io.on('reconnect', () => {
      void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
    });
    return () => {
      socket.disconnect();
    };
  }, [status, queryClient]);

  return <>{children}</>;
}
