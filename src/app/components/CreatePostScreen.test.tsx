import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreatePostScreen } from './CreatePostScreen';
import { FeedScreen } from './FeedScreen';
import { Toaster } from './ui/sonner';
import { renderRoutes, renderWithProviders } from '../../test/utils';
import {
  page,
  postView,
  signIn,
  TEST_USER,
  type Handler,
} from '../../test/api';
import { json } from '../../test/setup';
import type { PostView } from '../lib/posts-api';

// Crear publicación contra la API simulada (spec 0005).

/** API mínima con estado: POST /posts guarda y las listas devuelven lo guardado. */
function fakePostsApi(respond?: Handler) {
  const posts: PostView[] = [];
  const bodies: unknown[] = [];
  const fetchMock = signIn(async (url, init) => {
    const custom = await respond?.(url, init);
    if (custom) return custom;
    if (url.pathname.endsWith('/posts') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as {
        content: string;
        location?: string;
      };
      bodies.push(body);
      const created = postView({
        id: `nuevo-${posts.length + 1}`,
        content: body.content.trim(),
        location: body.location ?? null,
        author: { id: TEST_USER.id, displayName: 'Carlos Gómez' },
      });
      posts.unshift(created);
      return json(201, created);
    }
    if (url.pathname.endsWith('/posts/feed')) return page(posts);
    if (url.pathname.endsWith(`/users/${TEST_USER.id}/posts`)) {
      return page(posts);
    }
    if (url.pathname.endsWith(`/users/${TEST_USER.id}/posts/count`)) {
      return json(200, { count: posts.length });
    }
    return undefined;
  });
  return { fetchMock, bodies };
}

const textbox = () => screen.getByLabelText(/texto de la publicación/i);
const publishButton = () =>
  screen.getByRole('button', { name: /^publicar$|publicando/i });

describe('Spec 0005 — Crear publicación', () => {
  it('AC-1 y AC-3: publica, vuelve a /home y aparece primera en el feed', async () => {
    const user = userEvent.setup();
    const { bodies } = fakePostsApi();
    renderRoutes(
      [
        { path: '/create-post', element: <CreatePostScreen /> },
        { path: '/home', element: <FeedScreen /> },
      ],
      { route: '/create-post' },
    );

    await user.type(textbox(), 'Llevo café para el grupo de estudio');
    await user.click(
      screen.getByRole('button', { name: /agregar ubicación/i }),
    );
    await user.click(screen.getByRole('button', { name: 'Biblioteca' }));
    await user.click(publishButton());

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/home'),
    );
    expect(await screen.findByTestId('post-nuevo-1')).toHaveTextContent(
      'Llevo café para el grupo de estudio',
    );
    expect(bodies).toEqual([
      {
        content: 'Llevo café para el grupo de estudio',
        location: 'Biblioteca',
      },
    ]);
  });

  it('AC-11: sin imagen, video ni carrera; nombre y carrera de la sesión; contador de 2000', async () => {
    fakePostsApi();
    renderWithProviders(<CreatePostScreen />, { route: '/create-post' });

    expect(await screen.findByText('Carlos Gómez')).toBeInTheDocument();
    expect(
      await screen.findByText('Ingeniería de Software'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(screen.getByTestId('char-count')).toHaveTextContent('0/2000');

    fireEvent.change(textbox(), { target: { value: 'a'.repeat(2001) } });
    expect(screen.getByTestId('char-count')).toHaveTextContent('2001/2000');
    expect(publishButton()).toBeDisabled();
  });

  it('AC-2: publicar vacío avisa sin llamar a la API', async () => {
    const user = userEvent.setup();
    const { bodies } = fakePostsApi();
    renderWithProviders(
      <>
        <CreatePostScreen />
        <Toaster />
      </>,
      { route: '/create-post' },
    );

    await user.type(textbox(), '   ');
    await user.click(publishButton());

    expect(
      await screen.findByText('Escribe algo antes de publicar.'),
    ).toBeInTheDocument();
    expect(bodies).toHaveLength(0);
  });

  it('AC-10: varios toques envían una sola petición y el botón dice "Publicando…"', async () => {
    const user = userEvent.setup();
    let release: () => void = () => undefined;
    const { fetchMock } = fakePostsApi((url, init) =>
      url.pathname.endsWith('/posts') && init?.method === 'POST'
        ? new Promise<Response>((resolve) => {
            release = () => resolve(json(201, postView({ id: 'x' })));
          })
        : undefined,
    );
    renderWithProviders(<CreatePostScreen />, { route: '/create-post' });

    await user.type(textbox(), 'Hola');
    await user.click(publishButton());
    await user.click(publishButton());
    await user.click(publishButton());

    expect(publishButton()).toHaveTextContent('Publicando…');
    expect(publishButton()).toBeDisabled();
    const posts = fetchMock.mock.calls.filter(
      ([, init]) => init?.method === 'POST',
    );
    expect(posts).toHaveLength(1);
    release();
  });

  it('AC-10 y AC-12: si la API falla, el texto y la ubicación quedan y se ve el aviso traducido', async () => {
    const user = userEvent.setup();
    fakePostsApi((url, init) =>
      url.pathname.endsWith('/posts') && init?.method === 'POST'
        ? json(429, { statusCode: 429, code: 'TOO_MANY_REQUESTS' })
        : undefined,
    );
    renderWithProviders(
      <>
        <CreatePostScreen />
        <Toaster />
      </>,
      { route: '/create-post' },
    );

    await user.type(textbox(), 'Otra más');
    await user.click(
      screen.getByRole('button', { name: /agregar ubicación/i }),
    );
    await user.click(screen.getByRole('button', { name: 'Auditorio' }));
    await user.click(publishButton());

    expect(
      await screen.findByText('Demasiados intentos. Espera un minuto.'),
    ).toBeInTheDocument();
    expect(textbox()).toHaveValue('Otra más');
    expect(screen.getByText('Auditorio')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/create-post');
    expect(publishButton()).toBeEnabled();
  });
});
