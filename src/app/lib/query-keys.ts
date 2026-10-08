/**
 * Claves de caché de TanStack Query (spec 0005). Todas las de publicaciones
 * cuelgan de ['posts'], así invalidar postKeys.all refresca "Para ti", las
 * pestañas de carrera, el perfil y el conteo de una vez.
 */
export const postKeys = {
  all: ['posts'] as const,
  feed: (careerId: string | null) => ['posts', 'feed', careerId] as const,
  byAuthor: (userId: string) => ['posts', 'author', userId] as const,
  count: (userId: string) => ['posts', 'count', userId] as const,
};

/**
 * ¿La clave es una lista paginada de publicaciones (feed, perfil, búsqueda o
 * explorar)? Las reacciones se ajustan en todas a la vez; el conteo de un
 * perfil (['posts', 'count', …]) no es una lista.
 */
export function isPostListKey(key: readonly unknown[]): boolean {
  const [root, kind] = key;
  return (
    (root === 'posts' && (kind === 'feed' || kind === 'author')) ||
    (root === 'search' && kind === 'posts') ||
    (root === 'explore' && kind === 'posts')
  );
}

export const careerKeys = {
  all: ['careers'] as const,
};

/** Mensajería (spec 0008, decisión 25): todo cuelga de ['conversations']. */
export const conversationKeys = {
  all: ['conversations'] as const,
  inbox: ['conversations', 'inbox'] as const,
  detail: (id: string) => ['conversations', 'detail', id] as const,
  messages: (id: string) => ['conversations', 'messages', id] as const,
};

/** Notificaciones (decisión 27): todo cuelga de ['notifications']. */
export const notificationKeys = {
  all: ['notifications'] as const,
  list: ['notifications', 'list'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  preferences: ['notifications', 'preferences'] as const,
};

/** Perfiles y privacidad (decisión 15): cambiar la privacidad invalida profileKeys.all. */
export const profileKeys = {
  all: ['profiles'] as const,
  view: (userId: string) => ['profiles', 'view', userId] as const,
  privacy: ['profiles', 'privacy'] as const,
};

/** Seguimiento y red (decisión 16): todo cuelga de ['follows']. */
export const followKeys = {
  all: ['follows'] as const,
  followers: (userId: string) => ['follows', 'followers', userId] as const,
  following: (userId: string) => ['follows', 'following', userId] as const,
  requests: ['follows', 'requests'] as const,
};

/** Bloqueos (decisión 29): lista de usuarios bloqueados. */
export const blockKeys = {
  all: ['blocks'] as const,
  list: ['blocks', 'list'] as const,
};

/** Búsqueda y descubrimiento (spec 0008, decisión 28). */
export const searchKeys = {
  all: ['search'] as const,
  users: (q: string) => ['search', 'users', q] as const,
  posts: (q: string) => ['search', 'posts', q] as const,
  explore: () => ['explore', 'posts'] as const,
};

/** Historias (decisión 22): todo cuelga de ['stories']. */
export const storyKeys = {
  all: ['stories'] as const,
  tray: ['stories', 'tray'] as const,
};

/** Comentarios (spec 0009, decisión 21): los de cada publicación. */
export const commentKeys = {
  all: ['comments'] as const,
  post: (postId: string) => ['comments', 'post', postId] as const,
};
