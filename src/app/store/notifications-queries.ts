/**
 * Hooks de datos de notificaciones (spec 0008, decisión 27). Las pantallas
 * solo leen estos hooks; la red queda en notifications-api.ts y los avisos que
 * llegan por el socket refrescan la caché con refreshNotifications.
 */
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  notificationsApi,
  type NotificationPreferencesUpdate,
} from '../lib/notifications-api';
import { notificationKeys } from '../lib/query-keys';

const firstPage = null as string | null;

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: notificationKeys.list,
    queryFn: ({ pageParam }) => notificationsApi.list(pageParam),
    initialPageParam: firstPage,
    getNextPageParam: (page) => page.nextCursor,
  });
}

export function useUnreadNotifications() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: notificationsApi.unreadCount,
    select: (data) => data.count,
  });
}

/** Lista y conteo se piden de nuevo: lo que cambió lo decide la API. */
export function refreshNotifications(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: notificationKeys.all });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => refreshNotifications(queryClient),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => refreshNotifications(queryClient),
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences,
    queryFn: notificationsApi.preferences,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: NotificationPreferencesUpdate) =>
      notificationsApi.updatePreferences(changes),
    onSuccess: (preferences) =>
      queryClient.setQueryData(notificationKeys.preferences, preferences),
  });
}
