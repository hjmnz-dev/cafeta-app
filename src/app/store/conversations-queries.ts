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
import {
  withIncomingMessage,
  withUpdatedMessage,
  withoutMessage,
  type Pages,
} from '../lib/messages';
import { conversationKeys } from '../lib/query-keys';

const firstPage = null as string | null;

export function useInbox(enabled = true) {
  return useInfiniteQuery({
    queryKey: conversationKeys.inbox,
    queryFn: ({ pageParam }) => conversationsApi.inbox(pageParam),
    initialPageParam: firstPage,
    getNextPageParam: (page) => page.nextCursor,
    enabled,
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

export function useEditMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      messageId,
      content,
    }: {
      messageId: string;
      content: string;
    }) => conversationsApi.edit(conversationId, messageId, content),
    onSuccess: (message) => applyUpdatedMessage(queryClient, message),
  });
}

export function useDeactivateMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) =>
      conversationsApi.deactivate(conversationId, messageId),
    onSuccess: (_data, messageId) =>
      applyDeactivatedMessage(queryClient, conversationId, messageId),
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

/** Actualiza un mensaje modificado en la caché del historial y de la bandeja. */
export function applyUpdatedMessage(
  queryClient: QueryClient,
  message: MessageView,
): void {
  queryClient.setQueryData<Pages<MessagePage>>(
    conversationKeys.messages(message.conversationId),
    (data) => (data ? withUpdatedMessage(data, message) : data),
  );
  void queryClient.invalidateQueries({ queryKey: conversationKeys.inbox });
}

/** Remueve un mensaje desactivado de la caché del historial y actualiza la bandeja. */
export function applyDeactivatedMessage(
  queryClient: QueryClient,
  conversationId: string,
  messageId: string,
): void {
  queryClient.setQueryData<Pages<MessagePage>>(
    conversationKeys.messages(conversationId),
    (data) => (data ? withoutMessage(data, messageId) : data),
  );
  void queryClient.invalidateQueries({ queryKey: conversationKeys.inbox });
}
