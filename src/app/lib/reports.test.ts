import { describe, it, expect } from 'vitest';
import {
  cleanDetails,
  countChars,
  REPORT_DETAILS_MAX,
  REPORT_REASONS,
  reportBlocker,
} from './reports';

describe('REPORT_REASONS', () => {
  it('ofrece los cinco motivos de la API, con "Otro" al final', () => {
    expect(REPORT_REASONS.map((r) => r.code)).toEqual([
      'INAPPROPRIATE',
      'HARASSMENT',
      'SPAM',
      'IMPERSONATION',
      'OTHER',
    ]);
  });
});

describe('cleanDetails', () => {
  it('recorta los espacios', () => {
    expect(cleanDetails('  hola  ')).toBe('hola');
  });

  it('un texto vacío o de puros espacios queda ausente', () => {
    expect(cleanDetails('')).toBeUndefined();
    expect(cleanDetails('   ')).toBeUndefined();
  });
});

describe('countChars', () => {
  it('cuenta un emoji como un solo carácter', () => {
    expect(countChars('hola 👋')).toBe(6);
  });
});

describe('reportBlocker', () => {
  it('pide un motivo mientras no haya ninguno', () => {
    expect(reportBlocker(null, '')).toBe('Elige un motivo.');
  });

  it('un motivo normal se puede enviar sin detalle', () => {
    expect(reportBlocker('SPAM', '')).toBeNull();
  });

  it('"Otro" exige un detalle que no sea solo espacios', () => {
    expect(reportBlocker('OTHER', '')).toBe('Cuéntanos qué pasó.');
    expect(reportBlocker('OTHER', '   ')).toBe('Cuéntanos qué pasó.');
    expect(reportBlocker('OTHER', 'Me escribe a todas horas')).toBeNull();
  });

  it('rechaza un detalle de más de 500 caracteres, aunque el motivo no sea Otro', () => {
    expect(reportBlocker('SPAM', 'a'.repeat(REPORT_DETAILS_MAX))).toBeNull();
    expect(reportBlocker('SPAM', 'a'.repeat(REPORT_DETAILS_MAX + 1))).toMatch(
      /pasa de 500/,
    );
  });
});
