import { describe, expect, it } from 'vitest';
import { careerNameOf, memberSinceLabel, verificationLabel } from './account';

// Datos de la pantalla de Configuración (spec 0009, decisión 11; HU06 E1).
describe('memberSinceLabel', () => {
  it('muestra mes y año en español', () => {
    expect(memberSinceLabel('2026-10-02T14:00:00.000Z')).toBe(
      'octubre de 2026',
    );
  });

  it('usa la hora de Santo Domingo: la medianoche UTC del 1 sigue en el mes anterior', () => {
    expect(memberSinceLabel('2026-10-01T01:00:00.000Z')).toBe(
      'septiembre de 2026',
    );
  });

  it('una fecha inválida no muestra nada', () => {
    expect(memberSinceLabel('no es una fecha')).toBe('');
  });
});

describe('verificationLabel', () => {
  it.each([
    ['PENDING', 'Pendiente de verificación'],
    ['VERIFIED', 'Cuenta verificada'],
    ['REJECTED', 'Verificación rechazada'],
  ] as const)('%s se muestra como "%s"', (status, label) => {
    expect(verificationLabel(status)).toBe(label);
  });
});

describe('careerNameOf', () => {
  const careers = [
    { id: 'c1', name: 'Ingeniería de Software' },
    { id: 'c2', name: 'Biotecnología' },
  ];

  it('busca el nombre por id', () => {
    expect(careerNameOf(careers, 'c2')).toBe('Biotecnología');
  });

  it.each([
    ['sin carrera', careers, null],
    ['carreras sin cargar', undefined, 'c1'],
    ['una carrera que ya no está', careers, 'c9'],
  ])('devuelve null con %s', (_caso, list, id) => {
    expect(careerNameOf(list, id)).toBeNull();
  });
});
