/**
 * Hooks de datos de mensajería (spec 0008, decisión 25). Las pantallas solo
 * leen estos hooks; la red queda en conversations-api.ts, la caché en TanStack
 * Query y los mensajes que llegan por el socket entran con applyIncomingMessage.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  conversationsApi,
  type MessagePage,
  type MessageView,
} from '../lib/conversations-api';
import { withIncomingMessage, type Pages } from '../lib/messages';
import { conversationKeys } from '../lib/query-keys';

const firstPage = null as string | null;

export function useInbox() {
  return useInfiniteQuery({
    queryKey: conversationKeys.inbox,
    queryFn: ({ pageParam }) => conversationsApi.inbox(pageParam),
    initialPageParam: firstPage,
    getNextPageParam: (page) => page.nextCursor,
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: conversationKeys.detail(id),
    queryFn: () => conversationsApi.get(id),
    enabled: Boolean(id),
  });
}

/** Páginas del más reciente al más antiguo; "siguiente" son los más viejos. */
export function useMessages(id: string) {
  return useInfiniteQuery({
    queryKey: conversationKeys.messages(id),
    queryFn: ({ pageParam }) => conversationsApi.messages(id, pageParam),
    initialPageParam: firstPage,
    getNextPageParam: (page) => page.nextCursor,
    enabled: Boolean(id),
  });
}

export function useOpenConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: conversationsApi.open,
    onSuccess: (conversation) =>
      queryClient.setQueryData(
        conversationKeys.detail(conversation.id),
        conversation,
      ),
  });
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) =>
      conversationsApi.send(conversationId, content),
    onSuccess: (message) => applyIncomingMessage(queryClient, message),
  });
}

export function useMarkRead(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => conversationsApi.markRead(conversationId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: conversationKeys.inbox }),
  });
}

/**
 * Un mensaje nuevo (el que envié o uno que llegó por el socket): entra al
 * historial abierto sin volver a pedirlo, y la bandeja se refresca para
 * reordenarse y marcar lo no leído.
 */
export function applyIncomingMessage(
  queryClient: QueryClient,
  message: MessageView,
): void {
  queryClient.setQueryData<Pages<MessagePage>>(
    conversationKeys.messages(message.conversationId),
    (data) => (data ? withIncomingMessage(data, message) : data),
  );
  void queryClient.invalidateQueries({ queryKey: conversationKeys.inbox });
}
