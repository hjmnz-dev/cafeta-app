import { describe, it, expect } from 'vitest';
import {
  STORY_TTL_MS,
  isVigente,
  remainingLabel,
  visibleStories,
  visibleComments,
  reactionCounts,
  playbackQueue,
  authorSegment,
} from './stories';
import type { Story } from '../store/AppState';

const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1000;

const story = (patch: Partial<Story>): Story => ({
  id: 's1',
  authorId: 'maria',
  authorName: 'María Rodríguez',
  authorAvatar: '',
  text: 'Maratón de estudio.',
  createdAt: NOW - HOUR,
  active: true,
  edited: false,
  reactions: {},
  comments: [],
  ...patch,
});

describe('DEF-04 · lib/stories — vigencia y visibilidad de historias', () => {
  it('HU13 — una historia está vigente dentro de su ventana de 24 h', () => {
    expect(isVigente(story({ createdAt: NOW - 23 * HOUR }), NOW)).toBe(true);
    expect(isVigente(story({ createdAt: NOW - STORY_TTL_MS }), NOW)).toBe(
      false,
    );
  });

  it('HU15 — una historia desactivada deja de estar vigente aunque no haya vencido', () => {
    expect(isVigente(story({ active: false, createdAt: NOW }), NOW)).toBe(
      false,
    );
  });

  it('el tiempo restante se dice en horas, y en minutos cuando queda menos de una', () => {
    expect(remainingLabel(story({ createdAt: NOW - 3 * HOUR }), NOW)).toBe(
      'Quedan 21 h',
    );
    expect(remainingLabel(story({ createdAt: NOW - 23.5 * HOUR }), NOW)).toBe(
      'Quedan 30 min',
    );
    expect(remainingLabel(story({ createdAt: NOW - 25 * HOUR }), NOW)).toBe(
      'Vencida',
    );
    expect(remainingLabel(story({ active: false }), NOW)).toBe('Desactivada');
  });

  it('HU13 — solo se ven las historias propias y las de quienes se sigue', () => {
    const mia = story({
      id: 'mine',
      authorId: 'me',
      createdAt: NOW - 10 * HOUR,
    });
    const seguida = story({
      id: 'sig',
      authorId: 'maria',
      createdAt: NOW - 2 * HOUR,
    });
    const ajena = story({
      id: 'aje',
      authorId: 'pedro',
      createdAt: NOW - HOUR,
    });
    const vencida = story({
      id: 'old',
      authorId: 'maria',
      createdAt: NOW - 30 * HOUR,
    });

    const visibles = visibleStories([ajena, vencida, seguida, mia], {
      currentUserId: 'me',
      followingIds: ['maria'],
      now: NOW,
    });

    // La propia primero; después las seguidas, de más reciente a más antigua.
    expect(visibles.map((s) => s.id)).toEqual(['mine', 'sig']);
  });

  it('la reproducción va autor por autor, y dentro de cada autor de la más antigua a la más nueva', () => {
    const mia = story({ id: 'mia', authorId: 'me', createdAt: NOW - 3 * HOUR });
    const maria1 = story({
      id: 'maria1',
      authorId: 'maria',
      createdAt: NOW - 6 * HOUR,
    });
    const maria2 = story({
      id: 'maria2',
      authorId: 'maria',
      createdAt: NOW - 2 * HOUR,
    });

    // visibleStories entrega lo propio primero y luego lo más reciente.
    const visibles = visibleStories([maria1, maria2, mia], {
      currentUserId: 'me',
      followingIds: ['maria'],
      now: NOW,
    });

    expect(playbackQueue(visibles).map((s) => s.id)).toEqual([
      'mia',
      'maria1',
      'maria2',
    ]);
  });

  it('la barra de progreso mide solo las historias del autor que se está viendo', () => {
    const queue = [
      story({ id: 'mia', authorId: 'me' }),
      story({ id: 'maria1', authorId: 'maria' }),
      story({ id: 'maria2', authorId: 'maria' }),
    ];

    expect(authorSegment(queue, 'me').map((s) => s.id)).toEqual(['mia']);
    expect(authorSegment(queue, 'maria').map((s) => s.id)).toEqual([
      'maria1',
      'maria2',
    ]);
  });

  it('HU19 — los comentarios desactivados no se muestran', () => {
    const con = story({
      comments: [
        {
          id: 'c1',
          authorId: 'me',
          authorName: 'Yo',
          text: 'Visible',
          edited: false,
          active: true,
        },
        {
          id: 'c2',
          authorId: 'me',
          authorName: 'Yo',
          text: 'Retirado',
          edited: false,
          active: false,
        },
      ],
    });

    expect(visibleComments(con).map((c) => c.id)).toEqual(['c1']);
  });

  it('HU16 — las reacciones se resumen contando cada emoji', () => {
    const con = story({ reactions: { me: '❤️', maria: '❤️', juan: '🔥' } });

    expect(reactionCounts(con)).toEqual([
      { emoji: '❤️', count: 2 },
      { emoji: '🔥', count: 1 },
    ]);
  });
});
