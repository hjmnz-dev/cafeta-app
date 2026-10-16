/**
 * Lógica pura de la búsqueda (DEF-07 · HU41/HU42). La búsqueda la hace la API
 * (spec 0008, decisión 28); aquí queda lo que la pantalla necesita para
 * explicar sus resultados.
 */

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

/**
 * Bug 1031 · La búsqueda nunca devuelve a quien busca. Si la consulta es su
 * propio nombre o usuario, la pantalla lo dice en vez de quedar en blanco.
 */
export function matchesOwnAccount(
  query: string,
  me: { displayName: string; handle: string } | null | undefined,
): boolean {
  if (!me) return false;
  const terms = queryTerms(query);
  if (terms.length === 0) return false;
  const haystack = normalize(`${me.displayName} ${me.handle}`);
  return terms.every((term) => haystack.includes(term));
}
