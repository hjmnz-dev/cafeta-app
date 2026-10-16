import { describe, it, expect } from 'vitest';
import {
  countChars,
  orderCareerTabs,
  relativeTime,
  stepIndex,
  toCardPost,
} from './posts';
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

describe('toCardPost · datos de la tarjeta (AC-8)', () => {
  const now = new Date('2026-09-26T12:00:00Z');

  it('lleva nombre, carrera, conteos, ubicación y la marca de editado', () => {
    const card = toCardPost(
      postView({
        id: 'p1',
        content: 'Hola',
        location: 'Biblioteca',
        editedAt: '2026-09-26T11:30:00Z',
        createdAt: '2026-09-26T11:00:00Z',
        reactionCount: 4,
        commentCount: 2,
        author: { id: 'u1', displayName: 'Ana Pérez', careerName: 'Medicina' },
      }),
      now,
    );
    expect(card).toMatchObject({
      id: 'p1',
      authorId: 'u1',
      authorName: 'Ana Pérez',
      career: 'Medicina',
      time: '1h',
      type: 'text',
      content: 'Hola',
      location: 'Biblioteca',
      likes: 4,
      comments: 2,
      active: true,
      edited: true,
    });
  });

  it('sin editedAt no marca Editado, y los opcionales vacíos quedan sin definir', () => {
    const card = toCardPost(postView({ id: 'p2', content: null }), now);
    expect(card.edited).toBe(false);
    expect(card.content).toBe('');
    expect(card.location).toBeUndefined();
    expect(card.eventDate).toBeUndefined();
    expect(card.spotsAvailable).toBeUndefined();
  });

  it('lleva los campos propios de EVENT, CODE y STUDY_GROUP', () => {
    const event = toCardPost(
      postView({
        id: 'e',
        type: 'EVENT',
        eventStartsAt: '2026-10-10T14:00:00Z',
        eventLocation: 'Auditorio',
      }),
      now,
    );
    expect(event.type).toBe('event');
    expect(event.eventLocation).toBe('Auditorio');
    expect(event.eventDate).toMatch(/10/);

    const code = toCardPost(
      postView({ id: 'c', type: 'CODE', codeSnippet: 'let x = 1;' }),
      now,
    );
    expect(code).toMatchObject({ type: 'code', codeSnippet: 'let x = 1;' });

    const group = toCardPost(
      postView({
        id: 'g',
        type: 'STUDY_GROUP',
        groupName: 'Cálculo',
        groupSpots: 3,
      }),
      now,
    );
    expect(group).toMatchObject({ groupName: 'Cálculo', spotsAvailable: 3 });
  });

  it('un grupo con 0 cupos conserva el 0', () => {
    const group = toCardPost(
      postView({ id: 'g0', type: 'STUDY_GROUP', groupSpots: 0 }),
      now,
    );
    expect(group.spotsAvailable).toBe(0);
  });
});

describe('relativeTime · bordes', () => {
  const now = new Date('2026-09-26T12:00:00');
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it.each([
    [59_999, 'ahora'],
    [MIN, '1m'],
    [HOUR - 1, '59m'],
    [HOUR, '1h'],
    [DAY - 1, '23h'],
    [DAY, '1d'],
    [7 * DAY - 1, '6d'],
  ])('%i ms atrás se muestra como %s', (ms, expected) => {
    expect(relativeTime(ago(ms), now)).toBe(expected);
  });

  it('justo a los 7 días pasa a la fecha', () => {
    expect(relativeTime(ago(7 * DAY), now)).toBe('19 sep');
  });

  it('usa la abreviatura en español de cada mes', () => {
    const months = [
      'ene',
      'feb',
      'mar',
      'abr',
      'may',
      'jun',
      'jul',
      'ago',
      'sep',
      'oct',
      'nov',
      'dic',
    ];
    const later = new Date('2027-01-01T12:00:00');
    months.forEach((month, i) => {
      const date = new Date(2026, i, 5, 12).toISOString();
      expect(relativeTime(date, later)).toBe(`5 ${month}`);
    });
  });
});

describe('orderCareerTabs · bordes', () => {
  it('una carrera propia que ya no está en la lista se trata como sin carrera', () => {
    const careers = [
      { id: '2', name: 'Medicina' },
      { id: '1', name: 'Arquitectura' },
    ];
    expect(orderCareerTabs(careers, 'borrada').map((c) => c.id)).toEqual([
      '1',
      '2',
    ]);
  });

  it('ordena con las reglas del español (acentos) y desempata por id', () => {
    const careers = [
      { id: 'b', name: 'Ética' },
      { id: 'z', name: 'Economía' },
      { id: 'a', name: 'Economía' },
    ];
    expect(orderCareerTabs(careers, null).map((c) => c.id)).toEqual([
      'a',
      'z',
      'b',
    ]);
  });

  it('una lista vacía da una lista vacía', () => {
    expect(orderCareerTabs([], 'x')).toEqual([]);
  });
});

describe('countChars · bordes', () => {
  it('cuenta vacío como 0 y los saltos de línea como caracteres', () => {
    expect(countChars('')).toBe(0);
    expect(countChars('a' + String.fromCharCode(10) + 'b')).toBe(3);
  });
});

describe('stepIndex (bug 1025)', () => {
  it('avanza y retrocede dando la vuelta en los extremos', () => {
    expect(stepIndex(0, 1, 4)).toBe(1);
    expect(stepIndex(3, 1, 4)).toBe(0);
    expect(stepIndex(0, -1, 4)).toBe(3);
  });

  it('sin imágenes queda en 0', () => {
    expect(stepIndex(0, 1, 0)).toBe(0);
  });
});
