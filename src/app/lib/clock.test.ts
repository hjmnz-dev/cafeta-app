import { describe, it, expect } from 'vitest';
import { clockLabel, msToNextMinute } from './clock';

describe('clockLabel', () => {
  it('usa 12 horas sin a. m./p. m., con los minutos en dos cifras', () => {
    expect(clockLabel(new Date(2026, 9, 16, 9, 5))).toBe('9:05');
    expect(clockLabel(new Date(2026, 9, 16, 21, 41))).toBe('9:41');
    expect(clockLabel(new Date(2026, 9, 16, 0, 0))).toBe('12:00');
    expect(clockLabel(new Date(2026, 9, 16, 12, 30))).toBe('12:30');
  });
});

describe('msToNextMinute', () => {
  it('cuenta lo que falta para el siguiente minuto', () => {
    expect(msToNextMinute(new Date(2026, 9, 16, 9, 5, 45, 500))).toBe(14_500);
    expect(msToNextMinute(new Date(2026, 9, 16, 9, 5, 0, 0))).toBe(60_000);
  });
});
