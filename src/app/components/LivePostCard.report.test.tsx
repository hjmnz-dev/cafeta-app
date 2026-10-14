import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LivePostCard } from './LivePostCard';
import { Toaster } from './ui/sonner';
import { renderWithProviders } from '../../test/utils';
import { postView, signIn } from '../../test/api';
import { json } from '../../test/setup';
import type { PostView } from '../lib/posts-api';

// Reportar una publicación real (HU56, spec 0008 decisión 30) con fetch simulado.
const THEIRS = '01926f00-0000-7000-8000-0000000000cc';

interface Call {
  method: string;
  body: unknown;
}

function fakeApi(response: () => Response = () => json(201, { id: 'r1' })) {
  const calls: Call[] = [];
  signIn(async (url, init) => {
    if (!url.pathname.endsWith('/reports')) return undefined;
    calls.push({
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return response();
  });
  return calls;
}

const renderCard = (view: PostView, isMine = false) =>
  renderWithProviders(
    <>
      <LivePostCard view={view} now={new Date()} isMine={isMine} />
      <Toaster />
    </>,
  );

const theirs = () => postView({ id: THEIRS, content: 'Vendo apuntes' });

const openMenu = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(
    screen.getByRole('button', { name: /opciones de la publicación/i }),
  );

const sendReport = async (
  user: ReturnType<typeof userEvent.setup>,
  reason = /spam o publicidad/i,
) => {
  await openMenu(user);
  await user.click(
    screen.getByRole('button', { name: /reportar publicación/i }),
  );
  await user.click(screen.getByLabelText(reason));
  await user.click(screen.getByRole('button', { name: /enviar denuncia/i }));
};

describe('HU56 — Reportar una publicación real', () => {
  it('HU56 E1: envía POST /reports con el id de la publicación y el motivo, y avisa', async () => {
    const user = userEvent.setup();
    const calls = fakeApi();
    renderCard(theirs());

    await sendReport(user);

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toEqual({
      method: 'POST',
      body: { targetType: 'POST', targetId: THEIRS, reason: 'SPAM' },
    });
    expect(
      await screen.findByText(/un administrador revisará tu reporte/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('con "Otro" manda el detalle sin espacios sobrantes', async () => {
    const user = userEvent.setup();
    const calls = fakeApi();
    renderCard(theirs());

    await openMenu(user);
    await user.click(
      screen.getByRole('button', { name: /reportar publicación/i }),
    );
    await user.click(screen.getByLabelText(/^otro$/i));
    await user.type(
      screen.getByLabelText(/cuéntanos qué pasó/i),
      '  Es un fraude  ',
    );
    await user.click(screen.getByRole('button', { name: /enviar denuncia/i }));

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].body).toEqual({
      targetType: 'POST',
      targetId: THEIRS,
      reason: 'OTHER',
      details: 'Es un fraude',
    });
  });

  it('después de reportar, el botón queda como "Publicación reportada" y apagado', async () => {
    const user = userEvent.setup();
    fakeApi();
    renderCard(theirs());

    await sendReport(user);
    await screen.findByText(/un administrador revisará tu reporte/i);
    await openMenu(user);

    expect(
      screen.getByRole('button', { name: /publicación reportada/i }),
    ).toBeDisabled();
  });

  it('HU56 E2: si ya había un reporte pendiente, lo dice, cierra y apaga el botón', async () => {
    const user = userEvent.setup();
    fakeApi(() =>
      json(409, {
        statusCode: 409,
        code: 'REPORT_ALREADY_PENDING',
        message: 'x',
      }),
    );
    renderCard(theirs());

    await sendReport(user);

    expect(
      await screen.findByText(/ya reportaste esto, un administrador/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    await openMenu(user);
    expect(
      screen.getByRole('button', { name: /publicación reportada/i }),
    ).toBeDisabled();
  });

  it('otro error se muestra dentro del diálogo y deja reintentar', async () => {
    const user = userEvent.setup();
    fakeApi(() =>
      json(404, { statusCode: 404, code: 'POST_NOT_FOUND', message: 'x' }),
    );
    renderCard(theirs());

    await sendReport(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Esa publicación ya no existe.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /enviar denuncia/i }),
    ).toBeEnabled();
  });

  it('una publicación propia no ofrece reportar', async () => {
    const user = userEvent.setup();
    fakeApi();
    renderCard(theirs(), true);

    await openMenu(user);

    expect(
      screen.queryByRole('button', { name: /reportar publicación/i }),
    ).toBeNull();
  });
});
