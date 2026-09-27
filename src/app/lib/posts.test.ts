import { describe, it, expect } from 'vitest';
import { countChars, orderCareerTabs, relativeTime, toCardPost } from './posts';
import { postView } from '../../test/api';

// Lógica pura de publicaciones (spec 0005).
describe('relativeTime', () => {
  const now = new Date('2026-09-26T12:00:00');
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it('usa ahora, minutos, horas y días hasta una semana', () => {
    expect(relativeTime(ago(30_000), now)).toBe('ahora');
    expect(relativeTime(ago(5 * 60_000), now)).toBe('5m');
    expect(relativeTime(ago(2 * 3_600_000), now)).toBe('2h');
    expect(relativeTime(ago(3 * 86_400_000), now)).toBe('3d');
  });

  it('desde 7 días muestra el día y el mes', () => {
    expect(
      relativeTime(new Date('2026-09-12T09:00:00').toISOString(), now),
    ).toBe('12 sep');
  });

  it('una fecha del futuro (reloj adelantado) cuenta como ahora', () => {
    expect(relativeTime(ago(-60_000), now)).toBe('ahora');
  });
});

describe('orderCareerTabs', () => {
  const careers = [
    { id: '3', name: 'Medicina' },
    { id: '1', name: 'Arquitectura' },
    { id: '2', name: 'Ingeniería de Software' },
  ];

  it('pone mi carrera primero y el resto en orden alfabético', () => {
    expect(orderCareerTabs(careers, '3').map((c) => c.name)).toEqual([
      'Medicina',
      'Arquitectura',
      'Ingeniería de Software',
    ]);
  });

  it('sin carrera propia, todas en orden alfabético', () => {
    expect(orderCareerTabs(careers, null).map((c) => c.id)).toEqual([
      '1',
      '2',
      '3',
    ]);
  });

  it('no cambia la lista recibida', () => {
    orderCareerTabs(careers, '3');
    expect(careers.map((c) => c.id)).toEqual(['3', '1', '2']);
  });
});

describe('countChars', () => {
  it('cuenta puntos de código como PostgreSQL', () => {
    expect(countChars('hola')).toBe(4);
    expect(countChars('❤️')).toBe(2);
    expect(countChars('😀')).toBe(1);
  });
});

describe('toCardPost', () => {
  it('convierte los tipos y deja la carrera vacía si el autor no tiene', () => {
    const now = new Date();
    expect(
      toCardPost(postView({ id: 'a', type: 'STUDY_GROUP' }), now).type,
    ).toBe('study-group');
    const announcement = toCardPost(
      postView({
        id: 'b',
        type: 'ANNOUNCEMENT',
        author: { careerName: null },
      }),
      now,
    );
    expect(announcement.type).toBe('text');
    expect(announcement.career).toBe('');
    expect(announcement.authorAvatar).toBe('');
  });
});
