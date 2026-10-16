import { describe, it, expect } from 'vitest';
import type {
  ConversationPage,
  MessagePage,
  MessageView,
} from './conversations-api';
import {
  chronological,
  hasUnreadConversation,
  initialsOf,
  socketUrl,
  withIncomingMessage,
  withoutMessage,
  withUpdatedMessage,
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

describe('withUpdatedMessage', () => {
  it('reemplaza el mensaje con el nuevo contenido y fecha de edición', () => {
    const data = {
      pages: pages(['m3', 'm2'], ['m1']),
      pageParams: [null, 'm2'],
    };
    const updated: MessageView = {
      ...msg('m2'),
      content: 'nuevo contenido',
      editedAt: '2026-10-06T12:05:00.000Z',
    };
    const next = withUpdatedMessage(data, updated);
    expect(next.pages[0].items.find((m) => m.id === 'm2')?.content).toBe(
      'nuevo contenido',
    );
    expect(next.pages[0].items.find((m) => m.id === 'm2')?.editedAt).toBe(
      '2026-10-06T12:05:00.000Z',
    );
  });
});

describe('withoutMessage', () => {
  it('remueve el mensaje desactivado de la lista de páginas', () => {
    const data = {
      pages: pages(['m3', 'm2'], ['m1']),
      pageParams: [null, 'm2'],
    };
    const next = withoutMessage(data, 'm2');
    expect(next.pages[0].items.map((m) => m.id)).toEqual(['m3']);
    expect(next.pages[1].items.map((m) => m.id)).toEqual(['m1']);
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

describe('hasUnreadConversation (bug 1024)', () => {
  const inbox = (...unread: boolean[]): ConversationPage => ({
    items: unread.map((u, i) => ({
      id: `c${i}`,
      otherUser: {
        id: `u${i}`,
        handle: `u${i}`,
        avatarUrl: null,
        displayName: `Persona ${i}`,
        careerName: null,
        verified: false,
      },
      lastMessage: null,
      unread: u,
    })),
    nextCursor: null,
  });

  it('con alguna conversación sin leer en cualquier página, sí', () => {
    expect(hasUnreadConversation([inbox(false), inbox(false, true)])).toBe(
      true,
    );
  });

  it('sin nada sin leer o sin bandeja todavía, no', () => {
    expect(hasUnreadConversation([inbox(false, false)])).toBe(false);
    expect(hasUnreadConversation([])).toBe(false);
  });
});
