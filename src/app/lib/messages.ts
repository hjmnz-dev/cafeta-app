/**
 * Lógica pura de mensajería (spec 0008, decisión 25): el historial en orden
 * para dibujarlo, cómo entra un mensaje que llega por el socket a la caché y
 * de dónde sale la URL del socket.
 */
import type { MessagePage, MessageView } from './conversations-api';

export const MESSAGE_CONTENT_MAX = 2000;

/** Forma de la caché de una lista infinita de TanStack Query. */
export interface Pages<T> {
  pages: T[];
  pageParams: unknown[];
}

/**
 * La API pagina del más reciente al más antiguo; el chat se lee al revés,
 * con el más antiguo arriba.
 */
export function chronological(pages: readonly MessagePage[]): MessageView[] {
  return pages.flatMap((page) => page.items).reverse();
}

/**
 * Suma un mensaje nuevo al principio de la primera página. Si ya estaba (quien
 * envía lo recibe también por el socket), devuelve lo mismo sin duplicarlo.
 */
export function withIncomingMessage(
  data: Pages<MessagePage>,
  message: MessageView,
): Pages<MessagePage> {
  const known = data.pages.some((page) =>
    page.items.some((m) => m.id === message.id),
  );
  if (known || data.pages.length === 0) return data;
  const [first, ...rest] = data.pages;
  return {
    ...data,
    pages: [{ ...first, items: [message, ...first.items] }, ...rest],
  };
}

/** Reemplaza el mensaje editado conservando el orden de las páginas. */
export function withUpdatedMessage(
  data: Pages<MessagePage>,
  updated: MessageView,
): Pages<MessagePage> {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((m) => (m.id === updated.id ? updated : m)),
    })),
  };
}

/** Quita un mensaje desactivado de la caché sin recargar. */
export function withoutMessage(
  data: Pages<MessagePage>,
  messageId: string,
): Pages<MessagePage> {
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.filter((m) => m.id !== messageId),
    })),
  };
}

/** El socket vive en la raíz del servidor de la API, fuera de /api/v1. */
export function socketUrl(apiUrl: string): string {
  return new URL(apiUrl).origin;
}

/** "Carlos Gómez" → "CG"; una sola palabra da su primera letra. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const TIME = new Intl.DateTimeFormat('es-DO', {
  hour: 'numeric',
  minute: '2-digit',
});

/** Hora corta del mensaje, por ejemplo "3:05 p. m.". */
export function messageTime(iso: string): string {
  return TIME.format(new Date(iso));
}
