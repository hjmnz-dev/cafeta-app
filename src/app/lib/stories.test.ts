import { describe, expect, it } from 'vitest';
import type { StoryGroup, StoryView } from './stories-api';
import {
  authorSegment,
  groupOf,
  mapStoryInTray,
  playbackQueue,
  remainingLabel,
  STORY_DURATION_MS,
  STORY_TEXT_MAX,
  withStoryReaction,
} from './stories';

// Reglas puras de las historias de la API (decisión 22): cola de reproducción,
// tramo de un autor y tiempo restante. Sin reloj ni red.
const NOW = Date.parse('2026-10-07T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;

const story = (id: string): StoryView => ({
  id,
  text: null,
  editedAt: null,
  myReaction: null,
  reactionCount: null,
  commentCount: 0,
  seenByMe: false,
  createdAt: '2026-10-07T10:00:00.000Z',
  expiresAt: '2026-10-08T10:00:00.000Z',
  media: {
    mediaType: 'IMAGE',
    url: `https://blob.test/${id}.jpg`,
    mimeType: 'image/jpeg',
  },
});

const group = (authorId: string, ids: string[]): StoryGroup => ({
  author: {
    id: authorId,
    handle: authorId,
    displayName: authorId,
    avatarUrl: null,
  },
  stories: ids.map(story),
});

describe('lib/stories', () => {
  it('cada historia dura 10 s en pantalla y el texto admite 280 caracteres', () => {
    expect(STORY_DURATION_MS).toBe(10_000);
    expect(STORY_TEXT_MAX).toBe(280);
  });

  describe('playbackQueue', () => {
    it('va autor por autor, en el orden de la bandeja, y conserva el orden de cada autor', () => {
      const queue = playbackQueue([
        group('ana', ['a1', 'a2']),
        group('beto', ['b1']),
      ]);

      expect(queue.map((entry) => entry.story.id)).toEqual(['a1', 'a2', 'b1']);
      expect(queue.map((entry) => entry.author.id)).toEqual([
        'ana',
        'ana',
        'beto',
      ]);
    });

    it('una bandeja vacía da una cola vacía', () => {
      expect(playbackQueue([])).toEqual([]);
    });
  });

  describe('authorSegment', () => {
    it('devuelve solo las historias del autor que se está viendo', () => {
      const queue = playbackQueue([
        group('ana', ['a1', 'a2']),
        group('beto', ['b1']),
      ]);

      expect(
        authorSegment(queue, 'ana').map((entry) => entry.story.id),
      ).toEqual(['a1', 'a2']);
      expect(
        authorSegment(queue, 'beto').map((entry) => entry.story.id),
      ).toEqual(['b1']);
      expect(authorSegment(queue, 'nadie')).toEqual([]);
    });
  });

  describe('groupOf', () => {
    const groups = [group('ana', ['a1']), group('beto', ['b1'])];

    it('encuentra el grupo de un autor', () => {
      expect(groupOf(groups, 'beto')?.stories[0]?.id).toBe('b1');
    });

    it.each([['nadie'], [undefined]])(
      'sin historias vigentes (%s) no hay grupo',
      (authorId) => {
        expect(groupOf(groups, authorId)).toBeUndefined();
      },
    );
  });

  describe('remainingLabel', () => {
    it.each([
      [3 * HOUR + 10 * 60 * 1000, 'Quedan 3 h'],
      [1 * HOUR, 'Quedan 1 h'],
      [45 * 60 * 1000, 'Quedan 45 min'],
      [20 * 1000, 'Quedan 1 min'],
    ])('con %i ms por delante dice "%s"', (left, label) => {
      expect(remainingLabel(new Date(NOW + left).toISOString(), NOW)).toBe(
        label,
      );
    });

    it('una historia que ya venció dice "Vencida"', () => {
      expect(remainingLabel(new Date(NOW - 1).toISOString(), NOW)).toBe(
        'Vencida',
      );
    });
  });
});

describe('reacciones de historias (decisión 24)', () => {
  it('withStoryReaction pone o quita mi reacción sin tocar el conteo del autor', () => {
    const base = { ...story('a'), reactionCount: 4 };

    expect(withStoryReaction(base, 'FIRE')).toMatchObject({
      myReaction: 'FIRE',
      reactionCount: 4,
    });
    expect(
      withStoryReaction(withStoryReaction(base, 'FIRE'), null).myReaction,
    ).toBeNull();
  });

  it('mapStoryInTray cambia solo la historia pedida y deja el resto igual', () => {
    const tray = {
      groups: [group('ana', ['a1', 'a2']), group('beto', ['b1'])],
    };

    const next = mapStoryInTray(tray, 'a2', (s) => withStoryReaction(s, 'WOW'));

    expect(next?.groups[0].stories.map((s) => s.myReaction)).toEqual([
      null,
      'WOW',
    ]);
    expect(next?.groups[1]).toEqual(tray.groups[1]);
    expect(mapStoryInTray(undefined, 'a2', (s) => s)).toBeUndefined();
  });
});
