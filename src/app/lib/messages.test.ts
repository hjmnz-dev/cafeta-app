import { describe, it, expect } from 'vitest';
import type { MessagePage, MessageView } from './conversations-api';
import {
  chronological,
  initialsOf,
  socketUrl,
  withIncomingMessage,
} from './messages';

const msg = (id: string): MessageView => ({
  id,
  conversationId: 'c1',
  senderId: 'u1',
  content: id,
  createdAt: '2026-10-06T12:00:00.000Z',
  editedAt: null,
});

const pages = (...groups: string[][]): MessagePage[] =>
  groups.map((ids, i) => ({
    items: ids.map(msg),
    nextCursor: i < groups.length - 1 ? ids.at(-1)! : null,
  }));

describe('chronological', () => {
  it('invierte las páginas de la API (reciente primero) a orden de lectura', () => {
    expect(
      chronological(pages(['m4', 'm3'], ['m2', 'm1'])).map((m) => m.id),
    ).toEqual(['m1', 'm2', 'm3', 'm4']);
  });
});

describe('withIncomingMessage', () => {
  it('pone el mensaje nuevo al principio de la primera página', () => {
    const data = { pages: pages(['m2', 'm1']), pageParams: [null] };
    const next = withIncomingMessage(data, msg('m3'));
    expect(next.pages[0].items.map((m) => m.id)).toEqual(['m3', 'm2', 'm1']);
    expect(data.pages[0].items).toHaveLength(2);
  });

  it('no duplica un mensaje que ya estaba (el propio llega también por el socket)', () => {
    const data = { pages: pages(['m2'], ['m1']), pageParams: [null, 'm2'] };
    expect(withIncomingMessage(data, msg('m1'))).toBe(data);
  });
});

describe('socketUrl', () => {
  it('usa el origen de la API, sin /api/v1', () => {
    expect(socketUrl('https://cafeta-api-hj01.azurewebsites.net/api/v1')).toBe(
      'https://cafeta-api-hj01.azurewebsites.net',
    );
    expect(socketUrl('http://localhost:3040/api/v1')).toBe(
      'http://localhost:3040',
    );
  });
});

describe('initialsOf', () => {
  it('toma las iniciales de las dos primeras palabras', () => {
    expect(initialsOf('Carlos Gómez')).toBe('CG');
    expect(initialsOf('ana')).toBe('A');
    expect(initialsOf('  María José Peña ')).toBe('MJ');
  });
});
