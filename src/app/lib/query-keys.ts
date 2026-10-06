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
