import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { json } from '../../test/setup';
import { postView, signIn, type Handler } from '../../test/api';
import { renderWithProviders } from '../../test/utils';
import type { CommentView } from '../lib/comments-api';
import { CommentsPanel } from './CommentsPanel';
import { LivePostCard } from './LivePostCard';
import { Toaster } from './ui/sonner';

// Comentarios en publicaciones (spec 0009, decisión 21; HU21 a HU24) con fetch
// simulado. La API decide quién puede qué: aquí se prueba cómo lo dibuja y lo
// manda la web.
const POST = '01926f00-0000-7000-8000-0000000000a1';
const ME = '01926f00-0000-7000-8000-000000000001';
const BETO = '01926f00-0000-7000-8000-0000000000b1';
const NOW = new Date('2026-10-07T12:00:00.000Z');

const comment = (
  id: string,
  overrides: Partial<CommentView> = {},
): CommentView => ({
  id,
  content: `texto ${id}`,
  createdAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000).toISOString(),
  editedAt: null,
  author: {
    id: BETO,
    handle: 'beto_intec',
    displayName: 'Beto Ramírez',
    avatarUrl: null,
  },
  isMine: false,
  ...overrides,
});

const mine = (id: string, overrides: Partial<CommentView> = {}) =>
  comment(id, {
    isMine: true,
    author: {
      id: ME,
      handle: 'cgomez_intec',
      displayName: 'Carlos Gómez',
      avatarUrl: null,
    },
    ...overrides,
  });

const commentsPage = (items: CommentView[], nextCursor: string | null = null) =>
  json(200, { items, nextCursor });

const isList = (url: URL, init?: RequestInit) =>
  url.pathname.endsWith(`/posts/${POST}/comments`) &&
  (init?.method ?? 'GET') === 'GET';

interface Sent {
  create?: unknown;
  edit?: unknown;
  deactivated: boolean;
  listUrls: string[];
}

/** Panel abierto sobre una publicación, con la lista que devuelva `list()`. */
function renderPanel(
  list: (url: URL) => Response,
  handler: Handler = () => undefined,
  count = 2,
) {
  const sent: Sent = { deactivated: false, listUrls: [] };
  signIn(async (url, init) => {
    if (isList(url, init)) {
      sent.listUrls.push(url.search);
      return list(url);
    }
    if (
      url.pathname.endsWith(`/posts/${POST}/comments`) &&
      init?.method === 'POST'
    )
      sent.create = JSON.parse(String(init.body));
    if (/\/comments\/[^/]+$/.test(url.pathname) && init?.method === 'PATCH')
      sent.edit = JSON.parse(String(init.body));
    if (url.pathname.endsWith('/deactivate') && init?.method === 'POST')
      sent.deactivated = true;
    return handler(url, init);
  });
  renderWithProviders(
    <>
      <CommentsPanel target={{ kind: 'posts', id: POST }} count={count} />
      <Toaster />
    </>,
    { route: '/home' },
  );
  return sent;
}

const openMenu = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(
    await screen.findByRole('button', { name: 'Opciones del comentario' }),
  );

describe('HU22 · Leer los comentarios', () => {
  it('pide la lista al abrirse y la dibuja en el orden recibido, con quién y cuándo', async () => {
    renderPanel(() =>
      commentsPage([
        comment('c1', { content: 'Primero' }),
        comment('c2', { content: 'Segundo', editedAt: NOW.toISOString() }),
      ]),
    );

    expect(screen.getByText('Cargando comentarios…')).toBeInTheDocument();
    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('Primero')).toBeInTheDocument();
    expect(within(items[0]).getByText('Beto Ramírez')).toBeInTheDocument();
    expect(within(items[1]).getByText(/· Editado/)).toBeInTheDocument();
    expect(screen.getByText('Comentarios (2)')).toBeInTheDocument();
  });

  it('sin comentarios invita a escribir el primero', async () => {
    renderPanel(() => commentsPage([]), undefined, 0);

    expect(
      await screen.findByText(/aún no hay comentarios/i),
    ).toBeInTheDocument();
  });

  it('si la lista falla, avisa y deja reintentar', async () => {
    const user = userEvent.setup();
    let fail = true;
    renderPanel(() =>
      fail
        ? json(500, { statusCode: 500, code: 'INTERNAL_SERVER_ERROR' })
        : commentsPage([comment('c1', { content: 'Ya cargó' })]),
    );

    expect(
      await screen.findByText('No pudimos cargar los comentarios.'),
    ).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Ya cargó')).toBeInTheDocument();
  });

  it('"Ver más comentarios" pide la página siguiente con el cursor y la suma', async () => {
    const user = userEvent.setup();
    const sent = renderPanel((url) =>
      url.searchParams.get('cursor') === 'c1'
        ? commentsPage([comment('c2', { content: 'De la segunda página' })])
        : commentsPage([comment('c1', { content: 'De la primera' })], 'c1'),
    );

    await screen.findByText('De la primera');
    await user.click(
      screen.getByRole('button', { name: 'Ver más comentarios' }),
    );

    expect(await screen.findByText('De la segunda página')).toBeInTheDocument();
    expect(screen.getByText('De la primera')).toBeInTheDocument();
    expect(sent.listUrls.at(-1)).toContain('cursor=c1');
    expect(
      screen.queryByRole('button', { name: 'Ver más comentarios' }),
    ).not.toBeInTheDocument();
  });

  it('HU30 E2: los comentarios ajenos no traen menú; los míos sí', async () => {
    renderPanel(() =>
      commentsPage([comment('c1'), mine('c2', { content: 'El mío' })]),
    );

    await screen.findByText('El mío');
    expect(
      screen.getAllByRole('button', { name: 'Opciones del comentario' }),
    ).toHaveLength(1);
  });
});

describe('HU21 · Comentar', () => {
  const field = () =>
    screen.getByRole('textbox', { name: 'Escribe un comentario' });
  const send = () => screen.getByRole('button', { name: 'Enviar comentario' });

  it('HU29 E2: Enviar queda apagado con el campo vacío o con más de 500 caracteres', async () => {
    const user = userEvent.setup();
    renderPanel(() => commentsPage([]), undefined, 0);
    await screen.findByText(/aún no hay comentarios/i);

    expect(send()).toBeDisabled();
    await user.click(field());
    await user.paste('   ');
    expect(send()).toBeDisabled();
    await user.clear(field());
    await user.paste('a'.repeat(501));
    expect(screen.getByText('501/500')).toBeInTheDocument();
    expect(send()).toBeDisabled();
    await user.clear(field());
    await user.paste('a'.repeat(500));
    expect(send()).toBeEnabled();
  });

  it('HU29 E1: manda el texto recortado, vacía el campo y vuelve a pedir la lista', async () => {
    const user = userEvent.setup();
    let items: CommentView[] = [];
    const sent = renderPanel(
      () => commentsPage(items),
      (_url, init) => {
        if (init?.method !== 'POST') return undefined;
        items = [mine('c1', { content: 'Gracias por el resumen' })];
        return json(201, items[0]);
      },
      0,
    );
    await screen.findByText(/aún no hay comentarios/i);

    await user.type(field(), '  Gracias por el resumen  ');
    await user.click(send());

    expect(
      await screen.findByText('Gracias por el resumen'),
    ).toBeInTheDocument();
    expect(sent.create).toEqual({ content: 'Gracias por el resumen' });
    expect(field()).toHaveValue('');
  });

  it('si la API rechaza, avisa con su mensaje y conserva lo escrito', async () => {
    const user = userEvent.setup();
    renderPanel(
      () => commentsPage([]),
      (_url, init) =>
        init?.method === 'POST'
          ? json(404, { statusCode: 404, code: 'POST_NOT_FOUND' })
          : undefined,
      0,
    );
    await screen.findByText(/aún no hay comentarios/i);

    await user.type(field(), 'Hola');
    await user.click(send());

    expect(
      await screen.findByText('Esa publicación ya no existe.'),
    ).toBeInTheDocument();
    expect(field()).toHaveValue('Hola');
  });
});

describe('HU23 · Editar mi comentario', () => {
  it('HU30 E1: el campo trae el texto actual, Guardar espera un cambio y manda el texto recortado', async () => {
    const user = userEvent.setup();
    let current = mine('c1', { content: 'Original' });
    const sent = renderPanel(
      () => commentsPage([current]),
      (_url, init) => {
        if (init?.method !== 'PATCH') return undefined;
        current = {
          ...current,
          content: 'Corregido',
          editedAt: NOW.toISOString(),
        };
        return json(200, current);
      },
      1,
    );

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Editar' }));
    const box = screen.getByRole('textbox', { name: 'Editar comentario' });
    expect(box).toHaveValue('Original');
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    await user.clear(box);
    await user.type(box, '  Corregido  ');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(
      await screen.findByText('Comentario actualizado'),
    ).toBeInTheDocument();
    expect(sent.edit).toEqual({ content: 'Corregido' });
    expect(await screen.findByText(/· Editado/)).toBeInTheDocument();
    expect(screen.getByText('Corregido')).toBeInTheDocument();
  });

  it('Cancelar deja el comentario como estaba', async () => {
    const user = userEvent.setup();
    const sent = renderPanel(
      () => commentsPage([mine('c1', { content: 'Original' })]),
      undefined,
      1,
    );

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Editar' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Editar comentario' }),
      ' más',
    );
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(sent.edit).toBeUndefined();
  });
});

describe('HU24 · Desactivar mi comentario', () => {
  it('pide confirmación; cancelar no llama a la API', async () => {
    const user = userEvent.setup();
    const sent = renderPanel(() => commentsPage([mine('c1')]), undefined, 1);

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Desactivar' }));
    expect(
      screen.getByRole('dialog', { name: 'Desactivar comentario' }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(sent.deactivated).toBe(false);
    expect(
      screen.queryByRole('dialog', { name: 'Desactivar comentario' }),
    ).not.toBeInTheDocument();
  });

  it('HU31 E1: confirmar lo desactiva y desaparece de la lista', async () => {
    const user = userEvent.setup();
    let items = [mine('c1', { content: 'Se va' })];
    const sent = renderPanel(
      () => commentsPage(items),
      (url, init) => {
        if (init?.method !== 'POST' || !url.pathname.endsWith('/deactivate'))
          return undefined;
        items = [];
        return new Response(null, { status: 204 });
      },
      1,
    );

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Desactivar' }));
    await user.click(
      within(
        screen.getByRole('dialog', { name: 'Desactivar comentario' }),
      ).getByRole('button', { name: 'Desactivar' }),
    );

    expect(
      await screen.findByText('Comentario desactivado'),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText('Se va')).not.toBeInTheDocument(),
    );
    expect(sent.deactivated).toBe(true);
  });
});

describe('La tarjeta abre y cierra el panel', () => {
  it('el botón con el conteo muestra los comentarios y vuelve a ocultarlos', async () => {
    const user = userEvent.setup();
    signIn((url, init) => {
      if (isList(url, init))
        return commentsPage([comment('c1', { content: 'Visible al abrir' })]);
      return undefined;
    });
    renderWithProviders(
      <LivePostCard
        view={postView({ id: POST, commentCount: 1 })}
        now={NOW}
        isMine={false}
      />,
      { route: '/home' },
    );

    expect(screen.queryByText('Visible al abrir')).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: '1 comentario' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.click(button);

    expect(await screen.findByText('Visible al abrir')).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'true');
    await user.click(button);
    expect(screen.queryByText('Visible al abrir')).not.toBeInTheDocument();
  });

  it('con la lista de publicaciones simulada vacía no pide comentarios hasta abrir', async () => {
    const fetchMock = signIn();
    renderWithProviders(
      <LivePostCard
        view={postView({ id: POST, commentCount: 0 })}
        now={NOW}
        isMine={false}
      />,
      { route: '/home' },
    );

    await screen.findByRole('button', { name: '0 comentarios' });
    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls.some((u) => u.includes('/comments'))).toBe(false);
  });
});
