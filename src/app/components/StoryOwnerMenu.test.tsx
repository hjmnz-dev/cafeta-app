import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { json } from '../../test/setup';
import { signIn, TEST_USER, type Handler } from '../../test/api';
import { renderRoutes } from '../../test/utils';
import type { StoryGroup, StoryView } from '../lib/stories-api';
import { StoryViewerScreen } from './StoryViewerScreen';
import { Toaster } from './ui/sonner';

// Editar el texto y desactivar la historia propia desde el visor (spec 0009,
// decisión 23; HU14 y HU15). La API decide quién puede y cuándo: aquí se prueba
// cómo lo dibuja y lo manda la web.
const HOUR = 60 * 60 * 1000;

const story = (id: string, overrides: Partial<StoryView> = {}): StoryView => ({
  id,
  text: 'Texto original',
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

const group = (
  author: { id: string; handle: string; displayName: string },
  stories: StoryView[],
): StoryGroup => ({ author: { ...author, avatarUrl: null }, stories });

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

interface Sent {
  edit?: unknown;
  deactivated: boolean;
}

/** Visor de una historia, con la bandeja que devuelva `groups()` en cada petición. */
function renderViewer(
  groups: () => StoryGroup[],
  to: string,
  handler: Handler = () => undefined,
) {
  const sent: Sent = { deactivated: false };
  signIn(async (url, init) => {
    if (url.pathname.endsWith('/stories') && (init?.method ?? 'GET') === 'GET')
      return json(200, { groups: groups() });
    if (/\/stories\/[^/]+$/.test(url.pathname) && init?.method === 'PATCH')
      sent.edit = JSON.parse(String(init.body));
    if (url.pathname.endsWith('/deactivate') && init?.method === 'POST')
      sent.deactivated = true;
    return handler(url, init);
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
    { route: to },
  );
  return sent;
}

const openMenu = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(
    await screen.findByRole('button', { name: 'Opciones de la historia' }),
  );

describe('HU14 y HU15 · El menú de mi historia', () => {
  it('HU15 E2: solo aparece en la historia propia, no en la de otra persona', async () => {
    renderViewer(
      () => [group(ME, [story('m1')]), group(BETO, [story('b1')])],
      '/stories/b1',
    );
    await screen.findByText('Beto Ramírez');
    expect(
      screen.queryByRole('button', { name: 'Opciones de la historia' }),
    ).not.toBeInTheDocument();
  });

  it('en la propia ofrece Editar texto y Desactivar', async () => {
    const user = userEvent.setup();
    renderViewer(() => [group(ME, [story('m1')])], '/stories/m1');

    await openMenu(user);

    expect(
      screen.getByRole('menuitem', { name: 'Editar texto' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Desactivar' }),
    ).toBeInTheDocument();
  });

  it('HU14 E1: editar manda solo el texto nuevo y el visor lo muestra como editada', async () => {
    const user = userEvent.setup();
    let current = story('m1');
    const sent = renderViewer(
      () => [group(ME, [current])],
      '/stories/m1',
      (_url, init) => {
        if (init?.method !== 'PATCH') return undefined;
        current = { ...current, text: 'Texto corregido', editedAt: 'ahora' };
        return json(200, current);
      },
    );

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Editar texto' }));
    const box = screen.getByRole('textbox', { name: 'Texto de la historia' });
    expect(box).toHaveValue('Texto original');
    await user.clear(box);
    await user.type(box, '  Texto corregido  ');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Historia actualizada')).toBeInTheDocument();
    expect(sent.edit).toEqual({ text: 'Texto corregido' });
    expect(await screen.findByText(/· Editada/)).toBeInTheDocument();
    expect(screen.getByText('Texto corregido')).toBeInTheDocument();
    expect(
      screen.queryByRole('dialog', { name: 'Editar texto' }),
    ).not.toBeInTheDocument();
  });

  it('el texto puede quedar vacío: se manda vacío', async () => {
    const user = userEvent.setup();
    const sent = renderViewer(
      () => [group(ME, [story('m1')])],
      '/stories/m1',
      (_url, init) =>
        init?.method === 'PATCH'
          ? json(200, story('m1', { text: null }))
          : undefined,
    );

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Editar texto' }));
    await user.clear(
      screen.getByRole('textbox', { name: 'Texto de la historia' }),
    );
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(sent.edit).toEqual({ text: '' }));
  });

  it('Guardar queda apagado sin cambios y con más de 280 caracteres', async () => {
    const user = userEvent.setup();
    renderViewer(() => [group(ME, [story('m1')])], '/stories/m1');

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Editar texto' }));
    const save = screen.getByRole('button', { name: 'Guardar' });
    expect(save).toBeDisabled();

    const box = screen.getByRole('textbox', { name: 'Texto de la historia' });
    await user.clear(box);
    await user.click(box);
    await user.paste('a'.repeat(281));
    expect(screen.getByText('281/280')).toBeInTheDocument();
    expect(save).toBeDisabled();

    await user.clear(box);
    await user.click(box);
    await user.paste('a'.repeat(280));
    expect(save).toBeEnabled();
  });

  it('si la API rechaza el cambio, avisa con su mensaje y deja el diálogo abierto', async () => {
    const user = userEvent.setup();
    renderViewer(
      () => [group(ME, [story('m1')])],
      '/stories/m1',
      (_url, init) =>
        init?.method === 'PATCH'
          ? json(409, { statusCode: 409, code: 'STORY_EXPIRED' })
          : undefined,
    );

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Editar texto' }));
    const box = screen.getByRole('textbox', { name: 'Texto de la historia' });
    await user.type(box, ' más');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(
      await screen.findByText('Esta historia ya venció y no se puede cambiar.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Editar texto' })).toBeVisible();
  });

  it('desactivar pide confirmación; cancelar no llama a la API', async () => {
    const user = userEvent.setup();
    const sent = renderViewer(() => [group(ME, [story('m1')])], '/stories/m1');

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Desactivar' }));
    expect(
      screen.getByRole('dialog', { name: 'Desactivar historia' }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(sent.deactivated).toBe(false);
    expect(
      screen.queryByRole('dialog', { name: 'Desactivar historia' }),
    ).not.toBeInTheDocument();
  });

  it('HU15 E1: confirmar desactiva la historia y vuelve a la pantalla de origen', async () => {
    const user = userEvent.setup();
    let active = true;
    const sent = renderViewer(
      () => (active ? [group(ME, [story('m1')])] : []),
      '/stories/m1',
      (url, init) => {
        if (init?.method !== 'POST' || !url.pathname.endsWith('/deactivate'))
          return undefined;
        active = false;
        return new Response(null, { status: 204 });
      },
    );

    await openMenu(user);
    await user.click(screen.getByRole('menuitem', { name: 'Desactivar' }));
    await user.click(
      within(
        screen.getByRole('dialog', { name: 'Desactivar historia' }),
      ).getByRole('button', { name: 'Desactivar' }),
    );

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/home'),
    );
    expect(sent.deactivated).toBe(true);
  });
});

describe('HU14 · La reproducción espera mientras edito', () => {
  afterEach(() => vi.useRealTimers());

  it('con el menú abierto el visor no se cierra solo; al cerrarlo, vuelve a contar', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderViewer(() => [group(ME, [story('m1')])], '/stories/m1');

    await openMenu(user);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });
    expect(screen.getByTestId('location')).toHaveTextContent('/stories/m1');

    await user.click(screen.getByRole('button', { name: 'Cerrar menú' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(screen.getByTestId('location')).toHaveTextContent('/home');
  });
});
