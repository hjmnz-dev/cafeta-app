/**
 * Contraste de color según WCAG 2.1 (funcionalidad 5). Lógica pura, sin DOM:
 * sirve para comprobar en pruebas que los tokens de `styles/theme.css` cumplen
 * el nivel AA (4,5:1 para texto normal).
 */

/** Luminancia relativa de un color `#rrggbb`. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map(
    (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
  );
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** Razón de contraste entre dos colores `#rrggbb`, de 1 a 21. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** Valores `--token: #rrggbb` de un bloque de CSS, por nombre de token. */
export function readTokens(block: string): Readonly<Record<string, string>> {
  const found = block.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\b/g);
  return Object.fromEntries([...found].map((m) => [m[1]!, m[2]!]));
}
