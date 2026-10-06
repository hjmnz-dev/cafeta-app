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

/** Perfiles y privacidad (decisión 15): cambiar la privacidad invalida profileKeys.all. */
export const profileKeys = {
  all: ['profiles'] as const,
  view: (userId: string) => ['profiles', 'view', userId] as const,
  privacy: ['profiles', 'privacy'] as const,
};
