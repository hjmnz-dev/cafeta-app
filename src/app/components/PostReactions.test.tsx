import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppStatePosts, renderWithProviders } from '../../test/utils';

describe('DEF-06 · HU28 — Reaccionar a publicación', () => {
  it('reaccionar marca la publicación y suma al conteo; repetir la retira', async () => {
    const user = userEvent.setup();
    // Reaccionar sigue en AppState: el feed real llega sin botones (spec 0005).
    renderWithProviders(<AppStatePosts />);

    // p2 (Juan, 45 reacciones) es una publicación ajena del feed de ejemplo.
    const card = screen.getByTestId('post-p2');

    await user.click(within(card).getByRole('button', { name: /me gusta/i }));

    const marcada = within(card).getByRole('button', {
      name: /quitar reacción/i,
    });
    expect(marcada).toHaveAttribute('aria-pressed', 'true');
    expect(marcada).toHaveTextContent('46');

    await user.click(
      within(card).getByRole('button', { name: /quitar reacción/i }),
    );

    const sinMarcar = within(card).getByRole('button', { name: /me gusta/i });
    expect(sinMarcar).toHaveAttribute('aria-pressed', 'false');
    expect(sinMarcar).toHaveTextContent('45');
  });

  it('la reacción es independiente en cada publicación', async () => {
    const user = userEvent.setup();
    // Reaccionar sigue en AppState: el feed real llega sin botones (spec 0005).
    renderWithProviders(<AppStatePosts />);

    await user.click(
      within(screen.getByTestId('post-p2')).getByRole('button', {
        name: /me gusta/i,
      }),
    );

    expect(
      within(screen.getByTestId('post-p2')).getByRole('button', {
        name: /quitar reacción/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('post-p3')).getByRole('button', {
        name: /me gusta/i,
      }),
    ).toHaveTextContent('120');
  });
});
