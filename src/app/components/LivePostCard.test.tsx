import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LivePostCard } from './LivePostCard';
import { Toaster } from './ui/sonner';
import { renderWithProviders } from '../../test/utils';
import { postView, signIn, TEST_USER } from '../../test/api';
import { json } from '../../test/setup';
import type { PostView } from '../lib/posts-api';

// Gestionar mis publicaciones desde la tarjeta (spec 0008, decisión 17).
interface Call {
  method: string;
  path: string;
  body: unknown;
}

function fakeApi(status = 200, code = 'NOT_POST_AUTHOR') {
  const calls: Call[] = [];
  signIn(async (url, init) => {
    const method = init?.method ?? 'GET';
    if (!url.pathname.includes('/posts/mia')) return undefined;
    calls.push({
      method,
      path: url.pathname.replace(/^.*\/api\/v1/, ''),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    if (status !== 200) return json(status, { statusCode: status, code });
    if (method === 'PATCH') {
      const body = JSON.parse(String(init?.body)) as { content: string };
      return json(
        200,
        postView({
          id: 'mia',
          content: body.content,
          author: { id: TEST_USER.id },
        }),
      );
    }
    return new Response(null, { status: 204 });
  });
  return calls;
}

const mine = (overrides: Partial<PostView> = {}) =>
  postView({
    id: 'mia',
    content: 'Mi texto',
    author: { id: TEST_USER.id },
    ...overrides,
  });

const renderCard = (view: PostView, isMine = true) =>
  renderWithProviders(
    <>
      <LivePostCard view={view} now={new Date()} isMine={isMine} />
      <Toaster />
    </>,
  );

const openMenu = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(
    screen.getByRole('button', { name: /opciones de la publicación/i }),
  );

describe('Spec 0008 decisión 17 — Acciones del autor en la tarjeta', () => {
  it('HU22 E1: editar manda el texto nuevo con PATCH y cierra el editor', async () => {
    const user = userEvent.setup();
    const calls = fakeApi();
    renderCard(mine());

    await openMenu(user);
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    const box = screen.getByLabelText('Editar contenido de la publicación');
    await user.clear(box);
    await user.type(box, 'Texto corregido');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() =>
      expect(
        screen.queryByLabelText('Editar contenido de la publicación'),
      ).not.toBeInTheDocument(),
    );
    expect(calls).toEqual([
      {
        method: 'PATCH',
        path: '/posts/mia',
        body: { content: 'Texto corregido' },
      },
    ]);
    expect(
      await screen.findByText('Publicación actualizada.'),
    ).toBeInTheDocument();
  });

  it('el editor cuenta hasta 2000 y no deja guardar vacío si no hay adjuntos', async () => {
    const user = userEvent.setup();
    fakeApi();
    renderCard(mine());

    await openMenu(user);
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.clear(
      screen.getByLabelText('Editar contenido de la publicación'),
    );

    expect(screen.getByText('0/2000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('con adjuntos sí deja guardar el texto vacío (HU20 E2)', async () => {
    const user = userEvent.setup();
    const calls = fakeApi();
    renderCard(
      mine({
        media: [
          { url: 'https://blob/x', mediaType: 'IMAGE', mimeType: 'image/png' },
        ],
      }),
    );

    await openMenu(user);
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.clear(
      screen.getByLabelText('Editar contenido de la publicación'),
    );
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].body).toEqual({ content: '' });
  });

  it('HU23 E1: desactivar pide confirmar y llama a /deactivate', async () => {
    const user = userEvent.setup();
    const calls = fakeApi();
    renderCard(mine());

    await openMenu(user);
    await user.click(screen.getByRole('button', { name: 'Desactivar' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(
      /podrás reactivarla desde tus publicaciones archivadas/i,
    );
    expect(calls).toHaveLength(0);
    await user.click(
      screen.getAllByRole('button', { name: 'Desactivar' }).at(-1)!,
    );

    await waitFor(() =>
      expect(calls).toEqual([
        { method: 'POST', path: '/posts/mia/deactivate', body: undefined },
      ]),
    );
  });

  it('eliminar pide confirmar y llama a DELETE', async () => {
    const user = userEvent.setup();
    const calls = fakeApi();
    renderCard(mine());

    await openMenu(user);
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(screen.getByRole('dialog')).toHaveTextContent(
      /no se puede deshacer/i,
    );
    await user.click(
      screen.getAllByRole('button', { name: 'Eliminar' }).at(-1)!,
    );

    await waitFor(() =>
      expect(calls).toEqual([
        { method: 'DELETE', path: '/posts/mia', body: undefined },
      ]),
    );
  });

  it('si la API rechaza, muestra el mensaje traducido y deja el editor abierto', async () => {
    const user = userEvent.setup();
    fakeApi(403, 'NOT_POST_AUTHOR');
    renderCard(mine());

    await openMenu(user);
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.type(
      screen.getByLabelText('Editar contenido de la publicación'),
      '!',
    );
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(
      await screen.findByText(
        'Solo quien publicó puede cambiar esta publicación.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Editar contenido de la publicación'),
    ).toBeInTheDocument();
  });

  it('HU22 E2 y HU23 E2: en una publicación ajena no hay acciones de autor, solo reportar', async () => {
    const user = userEvent.setup();
    fakeApi();
    renderCard(
      postView({ id: 'ajena', author: { id: 'otra-persona' } }),
      false,
    );

    await openMenu(user);

    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Desactivar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Eliminar' })).toBeNull();
    expect(
      screen.getByRole('button', { name: /reportar publicación/i }),
    ).toBeInTheDocument();
  });
});

// Archivar y restaurar desde la tarjeta (HU21; spec 0008, funcionalidad 18).
describe('HU21 — Archivar, restaurar y reactivar desde la tarjeta', () => {
  it('E1: Archivar llama a /archive sin pedir confirmar y avisa', async () => {
    const user = userEvent.setup();
    const calls = fakeApi();
    renderCard(mine());

    await openMenu(user);
    await user.click(screen.getByRole('button', { name: 'Archivar' }));

    await waitFor(() =>
      expect(calls).toEqual([
        { method: 'POST', path: '/posts/mia/archive', body: undefined },
      ]),
    );
    expect(await screen.findByText('Publicación archivada.')).toBeVisible();
  });

  it('E2: una archivada ofrece Restaurar (no Archivar) y llama a /restore', async () => {
    const user = userEvent.setup();
    const calls = fakeApi();
    renderCard(mine({ state: 'ARCHIVED' }));

    expect(screen.getByText('Archivada')).toBeInTheDocument();
    await openMenu(user);
    expect(
      screen.queryByRole('button', { name: 'Archivar' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Restaurar' }));

    await waitFor(() =>
      expect(calls).toEqual([
        { method: 'POST', path: '/posts/mia/restore', body: undefined },
      ]),
    );
    expect(await screen.findByText('Publicación restaurada.')).toBeVisible();
  });

  it('una desactivada ofrece Reactivar, y ni editar ni archivar', async () => {
    const user = userEvent.setup();
    const calls = fakeApi();
    renderCard(mine({ state: 'DEACTIVATED' }));

    expect(screen.getByText('Desactivada')).toBeInTheDocument();
    await openMenu(user);
    for (const name of ['Editar', 'Archivar', 'Restaurar', 'Desactivar']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
    await user.click(screen.getByRole('button', { name: 'Reactivar' }));

    await waitFor(() =>
      expect(calls).toEqual([
        { method: 'POST', path: '/posts/mia/reactivate', body: undefined },
      ]),
    );
    expect(await screen.findByText('Publicación reactivada.')).toBeVisible();
  });

  it('si la API rechaza archivar, muestra el mensaje traducido', async () => {
    const user = userEvent.setup();
    fakeApi(409, 'ALREADY_ARCHIVED');
    renderCard(mine());

    await openMenu(user);
    await user.click(screen.getByRole('button', { name: 'Archivar' }));

    expect(
      await screen.findByText('Esa publicación ya estaba archivada.'),
    ).toBeInTheDocument();
  });
});
