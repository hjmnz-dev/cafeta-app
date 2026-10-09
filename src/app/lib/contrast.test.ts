import { describe, expect, it } from 'vitest';
import themeCss from '../../styles/theme.css?raw';
import { contrastRatio, readTokens } from './contrast';

const AA = 4.5;

const lightBlocks = themeCss.match(/:root\s*\{[^}]*\}/g) ?? [];
const darkBlock =
  themeCss.match(/:root\[data-theme='dark'\]\s*\{[^}]*\}/)?.[0] ?? '';
const light = lightBlocks.reduce(
  (acc, block) => ({ ...acc, ...readTokens(block) }),
  {} as Readonly<Record<string, string>>,
);
const dark = { ...light, ...readTokens(darkBlock) };

/** Pares texto sobre fondo que la app usa de verdad. */
const PAIRS: readonly (readonly [string, string])[] = [
  ['--ink', '--app-bg'],
  ['--ink', '--surface'],
  ['--ink-2', '--surface'],
  ['--muted', '--surface'],
  ['--muted', '--app-bg'],
  ['--muted', '--surface-3'],
  ['--brand', '--surface'],
  ['--brand', '--app-bg'],
  ['--brand', '--tint'],
  ['--on-brand', '--brand'],
  ['--tag-carrera-ink', '--tag-carrera-bg'],
  ['--tag-habilidad-ink', '--tag-habilidad-bg'],
  ['--tag-interes-ink', '--tag-interes-bg'],
];

describe('contraste de los tokens del tema', () => {
  it('calcula la razón de WCAG', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
  });

  describe.each([
    ['claro', light],
    ['oscuro', dark],
  ] as const)('tema %s', (_name, tokens) => {
    it.each(PAIRS)('%s sobre %s llega a AA', (fg, bg) => {
      const [front, back] = [tokens[fg], tokens[bg]];
      expect(front, fg).toBeDefined();
      expect(back, bg).toBeDefined();
      expect(contrastRatio(front!, back!)).toBeGreaterThanOrEqual(AA);
    });
  });
});
