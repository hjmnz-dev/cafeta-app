import { describe, expect, it } from 'vitest';
import { passwordProblem } from './password';

// Mismas reglas que la API (spec 0004, AC-4): 8 a 72, una letra y un número.
describe('passwordProblem', () => {
  it.each([
    ['8 caracteres', 'abcdefg1'],
    ['72 caracteres', `${'a'.repeat(71)}1`],
    ['mayúsculas y símbolos', 'Clave-Segura#2026'],
  ])('AC-4: acepta una contraseña de %s', (_caso, password) => {
    expect(passwordProblem(password)).toBeNull();
  });

  it('pide la contraseña cuando está vacía', () => {
    expect(passwordProblem('')).toBe('La contraseña es requerida');
  });

  it.each([
    ['7 caracteres', 'abcdef1'],
    ['73 caracteres', `${'a'.repeat(72)}1`],
  ])('AC-4: rechaza por largo una de %s', (_caso, password) => {
    expect(passwordProblem(password)).toBe(
      'La contraseña debe tener de 8 a 72 caracteres',
    );
  });

  it.each([
    ['solo letras', 'sololetras'],
    ['solo números', '12345678'],
    ['letras con tilde y números sin letra ASCII', 'ñññññ123'],
  ])('AC-4: rechaza una contraseña de %s', (_caso, password) => {
    expect(passwordProblem(password)).toBe(
      'La contraseña debe tener al menos una letra y un número',
    );
  });
});
