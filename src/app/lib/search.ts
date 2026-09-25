/**
 * Búsqueda global (DEF-07 · HU41/HU42).
 *
 * Sin backend, la búsqueda corre sobre el directorio y las publicaciones que ya
 * viven en el store. Dos decisiones que conviene no perder:
 *
 * - Se normaliza el texto (minúsculas y sin tildes) porque nadie escribe
 *   "Gómez" con tilde en un buscador: "gomez" tiene que encontrar a Gómez.
 * - Se exige que *todas* las palabras de la consulta aparezcan en algún campo,
 *   no una cualquiera, para que "maria medicina" no devuelva a toda Medicina.
 *
 * Con backend real esto se sustituye por una consulta al servidor manteniendo
 * la misma firma.
 */
import { DirectoryUser, Post } from '../store/AppState';

/** Minúsculas y sin diacríticos, para comparar como escribe la gente. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Palabras de la consulta. Se quitan los prefijos de mención y etiqueta para
 * que "@mrodriguez" y "#react" encuentren lo mismo que escribirlos sin símbolo.
 */
export function queryTerms(query: string): string[] {
  return normalize(query)
    .split(/\s+/)
    .map((term) => term.replace(/^[@#]+/, ''))
    .filter(Boolean);
}

function matchesAllTerms(fields: (string | undefined)[], terms: string[]): boolean {
  const haystack = normalize(fields.filter(Boolean).join(' '));
  return terms.every((term) => haystack.includes(term));
}

/** HU41 — Buscar usuarios por nombre, usuario, carrera, bio o etiquetas. */
export function searchUsers(users: DirectoryUser[], query: string): DirectoryUser[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];
  return users.filter((user) =>
    matchesAllTerms([user.name, user.handle, user.career, user.bio, ...user.tags.map((t) => t.label)], terms),
  );
}

/**
 * HU42 — Buscar contenido por palabra clave o etiqueta.
 *
 * Solo publicaciones activas: una publicación dada de baja (HU23) desaparece
 * para todos, y la búsqueda no puede ser la puerta trasera que la reviva.
 */
export function searchPosts(posts: Post[], query: string): Post[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];
  return posts.filter(
    (post) =>
      post.active &&
      matchesAllTerms(
        [
          post.content,
          post.authorName,
          post.career,
          post.resourceTitle,
          post.groupName,
          post.eventLocation,
          post.location,
        ],
        terms,
      ),
  );
}
