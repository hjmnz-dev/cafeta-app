/**
 * Lógica pura de guardar publicaciones (spec 0009, decisión 19): cómo se ajusta
 * una publicación en pantalla antes de que la API responda.
 */
import type { PostView } from './posts-api';

/** La publicación como queda guardada o quitada de mi lista. */
export function withSaved(view: PostView, saved: boolean): PostView {
  return { ...view, savedByMe: saved };
}
