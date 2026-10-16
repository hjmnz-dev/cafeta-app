/**
 * Canal de tiempo real con la API (spec 0008, decisión 25).
 *
 * Abre un solo socket mientras hay sesión, autenticado con el mismo JWT del
 * cliente HTTP, y vuelca cada evento en la caché de TanStack Query. No dibuja
 * nada ni guarda nada a nivel de módulo: el socket vive dentro del efecto y se
 * cierra al cerrar sesión.
 *
 * Los avisos nuevos también se reparten a quien los escuche con
 * useNotificationListener (bug 1024): así una pantalla dentro del router puede
 * mostrar el aviso emergente sin abrir otro socket.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import type { MessageView } from '../lib/conversations-api';
import type { NotificationView } from '../lib/notifications-api';
import { API_URL, readStoredSession } from '../lib/http';
import { socketUrl } from '../lib/messages';
import { conversationKeys } from '../lib/query-keys';
import {
  applyDeactivatedMessage,
  applyIncomingMessage,
  applyUpdatedMessage,
} from './conversations-queries';
import { refreshNotifications } from './notifications-queries';
import { useSession } from './SessionStore';

type NotificationListener = (notification: NotificationView) => void;
type Subscribe = (listener: NotificationListener) => () => void;

const NotificationsChannel = createContext<Subscribe>(() => () => undefined);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const queryClient = useQueryClient();
  // Quienes escuchan los avisos; se reemplaza el conjunto, nunca se muta.
  const listeners = useRef<ReadonlySet<NotificationListener>>(new Set());
  const subscribe = useCallback<Subscribe>((listener) => {
    listeners.current = new Set([...listeners.current, listener]);
    return () => {
      listeners.current = new Set(
        [...listeners.current].filter((l) => l !== listener),
      );
    };
  }, []);

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
    socket.on('message:updated', (message: MessageView) =>
      applyUpdatedMessage(queryClient, message),
    );
    socket.on(
      'message:deactivated',
      (payload: { id: string; conversationId: string }) =>
        applyDeactivatedMessage(
          queryClient,
          payload.conversationId,
          payload.id,
        ),
    );
    // Un aviso nuevo: la lista y el punto del ícono se piden de nuevo.
    socket.on('notification:new', (notification: NotificationView) => {
      void refreshNotifications(queryClient);
      listeners.current.forEach((listener) => listener(notification));
    });
    // Al reconectar pudo llegar algo mientras no había socket: se vuelve a pedir.
    socket.io.on('reconnect', () => {
      void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
      void refreshNotifications(queryClient);
    });
    return () => {
      socket.disconnect();
    };
  }, [status, queryClient]);

  return (
    <NotificationsChannel.Provider value={subscribe}>
      {children}
    </NotificationsChannel.Provider>
  );
}

/** Llama a `listener` con cada aviso que llega por el socket mientras el componente vive. */
export function useNotificationListener(listener: NotificationListener) {
  const subscribe = useContext(NotificationsChannel);
  const latest = useRef(listener);
  useEffect(() => {
    latest.current = listener;
  });
  useEffect(
    () => subscribe((notification) => latest.current(notification)),
    [subscribe],
  );
}
