import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { json } from '../../test/setup';
import { signIn, TEST_USER } from '../../test/api';
import { renderRoutes } from '../../test/utils';
import type { CommentView } from '../lib/comments-api';
import type { ReactionType } from '../lib/reactions';
import type { StoryGroup, StoryReactor, StoryView } from '../lib/stories-api';
import { StoryViewerScreen } from './StoryViewerScreen';
import { Toaster } from './ui/sonner';

// Reaccionar y comentar historias (spec 0009, decisión 24; HU16 a HU19) con
// fetch simulado. La API decide quién ve qué: aquí se prueba cómo lo dibuja y
// lo manda la web.
const HOUR = 60 * 60 * 1000;

const ME = {
  id: TEST_USER.id,
  handle: TEST_USER.profile.handle,
  displayName: TEST_USER.profile.displayName,
};
const BETO = {
  id: '01926f00-0000-7000-8000-0000000000b1',
  handle: 'beto_intec',
  displayName: 'Beto Ramírez',
};

const story = (id: string, overrides: Partial<StoryView> = {}): StoryView => ({
  id,
  text: 'Una historia',
  editedAt: null,
  myReaction: null,
  reactionCount: null,
  commentCount: 0,
  seenByMe: false,
  createdAt: new Date(Date.now() - HOUR).toISOString(),
  expiresAt: new Date(Date.now() + 5.5 * HOUR).toISOString(),
  media: {
    mediaType: 'IMAGE',
    url: `https://blob.test/${id}.jpg`,
    mimeType: 'image/jpeg',
  },
  ...overrides,
});

const comment = (
  id: string,
  overrides: Partial<CommentView> = {},
): CommentView => ({
  id,
  content: `texto ${id}`,
  createdAt: new Date(Date.now() - 2 * HOUR).toISOString(),
  editedAt: null,
  author: { ...BETO, avatarUrl: null },
  isMine: false,
  ...overrides,
});

const mine = (id: string, overrides: Partial<CommentView> = {}) =>
  comment(id, {
    isMine: true,
    author: { ...ME, avatarUrl: null },
    ...overrides,
  });

interface Call {
  method: string;
  path: string;
  body: unknown;
}

interface Scenario {
  author: typeof ME | typeof BETO;
  story?: Partial<StoryView>;
  comments?: CommentView[];
  /** Respuesta de error para las rutas de reacción. */
  reactionFails?: { status: number; code: string };
  /** Retiene la respuesta de la reacción hasta soltarla. */
  holdReaction?: boolean;
  /** Quién reaccionó a la historia (solo la ve su autor). */
  reactors?: StoryReactor[];
}

/** Visor de la historia `s1` con una API simulada que lleva el estado. */
function renderViewer(scenario: Scenario) {
  const calls: Call[] = [];
  let myReaction: ReactionType | null = scenario.story?.myReaction ?? null;
  let comments = scenario.comments ?? [];
  let release = () => undefined as void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const record = (url: URL, init?: RequestInit) =>
    calls.push({
      method: init?.method ?? 'GET',
      path: url.pathname.replace(/^.*\/api\/v1/, ''),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });

  signIn(async (url, init) => {
    const method = init?.method ?? 'GET';
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    if (path === '/stories' && method === 'GET') {
      const group: StoryGroup = {
        author: { ...scenario.author, avatarUrl: null },
        stories: [
          story('s1', {
            ...scenario.story,
            myReaction,
            commentCount: comments.length,
          }),
        ],
      };
      return json(200, { groups: [group] });
    }
    if (path === '/stories/s1/reaction') {
      record(url, init);
      if (scenario.holdReaction) await gate;
      if (scenario.reactionFails) {
        return json(scenario.reactionFails.status, {
          statusCode: scenario.reactionFails.status,
          code: scenario.reactionFails.code,
        });
      }
      myReaction =
        method === 'PUT'
          ? (JSON.parse(String(init?.body)) as { type: ReactionType }).type
          : null;
      return json(200, { myReaction, reactionCount: null });
    }
    if (path === '/stories/s1/reactions' && method === 'GET') {
      record(url, init);
      return json(200, { items: scenario.reactors ?? [], nextCursor: null });
    }
    if (path === '/stories/s1/comments' && method === 'GET') {
      record(url, init);
      return json(200, { items: comments, nextCursor: null });
    }
    if (path === '/stories/s1/comments' && method === 'POST') {
      record(url, init);
      const created = mine(`c${comments.length + 1}`, {
        content: (JSON.parse(String(init?.body)) as { content: string })
          .content,
      });
      comments = [...comments, created];
      return json(201, created);
    }
    const one = path.match(/^\/stories\/s1\/comments\/([^/]+)(\/deactivate)?$/);
    if (one) {
      record(url, init);
      if (one[2]) {
        comments = comments.filter((c) => c.id !== one[1]);
        return new Response(null, { status: 204 });
      }
      const body = JSON.parse(String(init?.body)) as { content: string };
      comments = comments.map((c) =>
        c.id === one[1]
          ? { ...c, content: body.content, editedAt: new Date().toISOString() }
          : c,
      );
      return json(
        200,
        comments.find((c) => c.id === one[1]),
      );
    }
    return undefined;
  });
  renderRoutes(
    [
      {
        path: '/stories/:storyId',
        element: (
          <>
            <StoryViewerScreen />
            <Toaster />
          </>
        ),
      },
      { path: '/home', element: <p>feed</p> },
    ],
    { route: '/stories/s1' },
  );
  return { calls, release };
}

const reactionRow = async () =>
  within(
    await screen.findByRole('group', { name: 'Reaccionar a la historia' }),
  );

describe('HU16 · Reaccionar a la historia de otra persona', () => {
  it('ofrece las cinco reacciones, ninguna marcada', async () => {
    renderViewer({ author: BETO });

    const row = await reactionRow();

    expect(
      row.getAllByRole('button').map((b) => b.getAttribute('aria-label')),
    ).toEqual(['Me encanta', 'Fuego', 'Aplauso', 'Risa', 'Asombro']);
    for (const button of row.getAllByRole('button')) {
      expect(button).toHaveAttribute('aria-pressed', 'false');
    }
  });

  it('HU16 E1: tocar una manda PUT con el tipo y la deja marcada', async () => {
    const user = userEvent.setup();
    const api = renderViewer({ author: BETO });

    const row = await reactionRow();
    await user.click(row.getByRole('button', { name: 'Fuego' }));

    await waitFor(() =>
      expect(row.getByRole('button', { name: 'Fuego' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
    expect(api.calls).toEqual([
      { method: 'PUT', path: '/stories/s1/reaction', body: { type: 'FIRE' } },
    ]);
  });

  it('se ve al instante, antes de que la API responda', async () => {
    const user = userEvent.setup();
    const api = renderViewer({ author: BETO, holdReaction: true });

    const row = await reactionRow();
    await user.click(row.getByRole('button', { name: 'Aplauso' }));

    expect(row.getByRole('button', { name: 'Aplauso' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    api.release();
    await waitFor(() => expect(api.calls).toHaveLength(1));
  });

  it('tocar la que ya tengo la quita con DELETE', async () => {
    const user = userEvent.setup();
    const api = renderViewer({ author: BETO, story: { myReaction: 'HEART' } });

    const row = await reactionRow();
    expect(row.getByRole('button', { name: 'Me encanta' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(row.getByRole('button', { name: 'Me encanta' }));

    await waitFor(() =>
      expect(row.getByRole('button', { name: 'Me encanta' })).toHaveAttribute(
        'aria-pressed',
        'false',
      ),
    );
    expect(api.calls).toEqual([
      { method: 'DELETE', path: '/stories/s1/reaction', body: undefined },
    ]);
  });

  it('HU16 E2: cambiar de expresión reemplaza la mía con un PUT', async () => {
    const user = userEvent.setup();
    const api = renderViewer({ author: BETO, story: { myReaction: 'HEART' } });

    const row = await reactionRow();
    await user.click(row.getByRole('button', { name: 'Asombro' }));

    await waitFor(() =>
      expect(row.getByRole('button', { name: 'Asombro' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
    expect(row.getByRole('button', { name: 'Me encanta' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(api.calls).toEqual([
      { method: 'PUT', path: '/stories/s1/reaction', body: { type: 'WOW' } },
    ]);
  });

  it('si la API falla vuelve atrás y avisa con un mensaje del código', async () => {
    const user = userEvent.setup();
    renderViewer({
      author: BETO,
      reactionFails: { status: 404, code: 'STORY_NOT_FOUND' },
    });

    const row = await reactionRow();
    await user.click(row.getByRole('button', { name: 'Risa' }));

    expect(
      await screen.findByText('Esta historia ya no está disponible.'),
    ).toBeInTheDocument();
    expect(row.getByRole('button', { name: 'Risa' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});

describe('HU16 · Mi historia muestra cuántas reacciones tiene', () => {
  it('no ofrece reaccionar a la propia y dice el conteo', async () => {
    renderViewer({ author: ME, story: { reactionCount: 3 } });

    expect(await screen.findByTestId('story-reactions')).toHaveTextContent(
      '3 reacciones',
    );
    expect(
      screen.queryByRole('group', { name: 'Reaccionar a la historia' }),
    ).not.toBeInTheDocument();
  });

  it('con una dice "1 reacción", en singular', async () => {
    renderViewer({ author: ME, story: { reactionCount: 1 } });

    expect(await screen.findByTestId('story-reactions')).toHaveTextContent(
      '1 reacción',
    );
  });

  it('sin reacciones lo dice con palabras', async () => {
    renderViewer({ author: ME, story: { reactionCount: 0 } });

    expect(await screen.findByTestId('story-reactions')).toHaveTextContent(
      'Aún sin reacciones',
    );
  });

  it('bug 1018: tocar el conteo muestra quién reaccionó y con qué', async () => {
    const user = userEvent.setup();
    const { calls } = renderViewer({
      author: ME,
      story: { reactionCount: 2 },
      reactors: [
        {
          id: 'r1',
          type: 'HEART',
          createdAt: new Date().toISOString(),
          user: {
            ...BETO,
            avatarUrl: null,
            careerName: null,
            verified: false,
          },
        },
        {
          id: 'r2',
          type: 'LAUGH',
          createdAt: new Date().toISOString(),
          user: {
            id: '01926f00-0000-7000-8000-0000000000c1',
            handle: 'carla',
            displayName: 'Carla Peña',
            avatarUrl: null,
            careerName: null,
            verified: true,
          },
        },
      ],
    });

    await user.click(await screen.findByTestId('story-reactions'));
    const sheet = within(
      await screen.findByRole('dialog', { name: 'Reacciones de la historia' }),
    );
    expect(await sheet.findByText('Beto Ramírez')).toBeInTheDocument();
    expect(sheet.getByRole('img', { name: 'Me encanta' })).toBeInTheDocument();
    expect(sheet.getByText('Carla Peña')).toBeInTheDocument();
    expect(sheet.getByRole('img', { name: 'Risa' })).toBeInTheDocument();
    expect(
      sheet.getByRole('img', { name: 'Cuenta verificada' }),
    ).toBeInTheDocument();
    expect(calls.map((c) => `${c.method} ${c.path}`)).toContain(
      'GET /stories/s1/reactions',
    );

    await user.click(sheet.getByRole('button', { name: 'Cerrar reacciones' }));
    expect(
      screen.queryByRole('dialog', { name: 'Reacciones de la historia' }),
    ).not.toBeInTheDocument();
  });

  it('bug 1018: sin nadie que reaccionara, la hoja lo dice', async () => {
    const user = userEvent.setup();
    renderViewer({ author: ME, story: { reactionCount: 0 } });

    await user.click(await screen.findByTestId('story-reactions'));
    expect(
      await screen.findByText('Aún nadie ha reaccionado a tu historia.'),
    ).toBeInTheDocument();
  });
});

describe('HU17 a HU19 · Comentarios de la historia', () => {
  const openSheet = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(
      await screen.findByRole('button', { name: /^Comentarios \(\d+\)$/ }),
    );
    return within(
      await screen.findByRole('dialog', { name: 'Comentarios de la historia' }),
    );
  };

  it('el botón muestra el conteo y abre la hoja con la lista', async () => {
    const user = userEvent.setup();
    const api = renderViewer({
      author: BETO,
      comments: [comment('c1'), comment('c2')],
    });

    expect(
      await screen.findByRole('button', { name: 'Comentarios (2)' }),
    ).toBeInTheDocument();
    const sheet = await openSheet(user);

    expect(await sheet.findByText('texto c1')).toBeInTheDocument();
    expect(sheet.getByText('texto c2')).toBeInTheDocument();
    expect(api.calls[0]).toMatchObject({
      method: 'GET',
      path: '/stories/s1/comments',
    });
  });

  it('HU17 E1: comentar manda el texto recortado a la historia y sube el conteo', async () => {
    const user = userEvent.setup();
    const api = renderViewer({ author: BETO });
    const sheet = await openSheet(user);

    await user.type(
      await sheet.findByLabelText('Escribe un comentario'),
      '  Qué buena foto  ',
    );
    await user.click(sheet.getByRole('button', { name: 'Enviar comentario' }));

    expect(await sheet.findByText('Qué buena foto')).toBeInTheDocument();
    expect(
      api.calls.find((c) => c.method === 'POST' && !c.path.includes('react')),
    ).toEqual({
      method: 'POST',
      path: '/stories/s1/comments',
      body: { content: 'Qué buena foto' },
    });
    expect(
      await screen.findByRole('button', { name: 'Comentarios (1)' }),
    ).toBeInTheDocument();
  });

  it('HU18 E1: editar y desactivar un comentario propio usan las rutas de la historia', async () => {
    const user = userEvent.setup();
    const api = renderViewer({
      author: BETO,
      comments: [mine('c1', { content: 'Original' })],
    });
    const sheet = await openSheet(user);

    await user.click(
      await sheet.findByRole('button', { name: 'Opciones del comentario' }),
    );
    await user.click(sheet.getByRole('menuitem', { name: 'Editar' }));
    const field = sheet.getByLabelText('Editar comentario');
    await user.clear(field);
    await user.type(field, 'Corregido');
    await user.click(sheet.getByRole('button', { name: 'Guardar' }));
    expect(await sheet.findByText('Corregido')).toBeInTheDocument();

    await user.click(
      sheet.getByRole('button', { name: 'Opciones del comentario' }),
    );
    await user.click(sheet.getByRole('menuitem', { name: 'Desactivar' }));
    await user.click(
      within(
        await screen.findByRole('dialog', { name: 'Desactivar comentario' }),
      ).getByRole('button', { name: 'Desactivar' }),
    );

    await waitFor(() =>
      expect(sheet.queryByText('Corregido')).not.toBeInTheDocument(),
    );
    expect(
      api.calls
        .filter((c) => c.path.startsWith('/stories/s1/comments/'))
        .map((c) => `${c.method} ${c.path.split('/').slice(4).join('/')}`),
    ).toEqual(['PATCH c1', 'POST c1/deactivate']);
  });

  it('cerrar la hoja la quita', async () => {
    const user = userEvent.setup();
    renderViewer({ author: BETO });
    const sheet = await openSheet(user);

    await user.click(sheet.getByRole('button', { name: 'Cerrar comentarios' }));

    expect(
      screen.queryByRole('dialog', { name: 'Comentarios de la historia' }),
    ).not.toBeInTheDocument();
  });
});

describe('HU17 · La reproducción espera mientras comento', () => {
  afterEach(() => vi.useRealTimers());

  it('con la hoja abierta el visor no se cierra solo; al cerrarla, vuelve a contar', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderViewer({ author: BETO });

    await user.click(
      await screen.findByRole('button', { name: /^Comentarios \(\d+\)$/ }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(screen.getByTestId('location')).toHaveTextContent('/stories/s1');

    await user.click(
      screen.getByRole('button', { name: 'Cerrar comentarios' }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(screen.getByTestId('location')).toHaveTextContent('/home');
  });
});
