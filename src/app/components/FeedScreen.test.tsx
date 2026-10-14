import { describe, it, expect } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedScreen } from './FeedScreen';
import { renderWithProviders } from '../../test/utils';
import { page, postView, signIn, TEST_USER } from '../../test/api';
import { json, TEST_CAREERS } from '../../test/setup';

// Feed real contra la API simulada (spec 0005).
const [SOFTWARE, MEDICINA] = TEST_CAREERS;

describe('Spec 0005 — Feed', () => {
  it('HU11 E1: muestra esqueletos y luego las publicaciones de la API', async () => {
    signIn((url) =>
      url.pathname.endsWith('/posts/feed')
        ? page([
            postView({ id: 'mia', author: { id: TEST_USER.id } }),
            postView({ id: 'ajena', content: 'Examen de física' }),
          ])
        : undefined,
    );
    renderWithProviders(<FeedScreen />, { route: '/home' });

    expect(screen.getAllByTestId('post-skeleton')).toHaveLength(3);
    expect(await screen.findByTestId('post-ajena')).toHaveTextContent(
      'Examen de física',
    );
    expect(screen.queryByTestId('post-skeleton')).toBeNull();
    expect(
      within(screen.getByTestId('post-mia')).getByRole('link', {
        name: 'Juan Pérez',
      }),
    ).toHaveAttribute('href', '/profile');
  });

  it('HU11 E2: "Para ti" vacío invita a descubrir estudiantes', async () => {
    signIn();
    renderWithProviders(<FeedScreen />, { route: '/home' });

    expect(await screen.findByText(/tu feed está vacío/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /descubrir estudiantes/i }),
    ).toHaveAttribute('href', '/discover');
  });

  it('AC-6: pestañas con mi carrera primero y la elegida en la dirección', async () => {
    const fetchMock = signIn();
    renderWithProviders(<FeedScreen />, {
      route: `/home?carrera=${MEDICINA.id}`,
    });

    const tabNames = () =>
      screen
        .getAllByRole('link', { name: /para ti|ingeniería|medicina/i })
        .map((t) => t.textContent);
    await waitFor(() =>
      expect(tabNames()).toEqual(['Para ti', SOFTWARE.name, MEDICINA.name]),
    );
    await waitFor(() =>
      expect(screen.getByRole('link', { name: MEDICINA.name })).toHaveAttribute(
        'aria-current',
        'page',
      ),
    );
    expect(
      await screen.findByText(/nadie de medicina ha publicado todavía/i),
    ).toBeInTheDocument();

    const feedCalls = fetchMock.mock.calls
      .map(([input]) => new URL(String(input)))
      .filter((u) => u.pathname.endsWith('/posts/feed'));
    // Espera la lista de carreras: nunca pide "Para ti" de más.
    expect(feedCalls).toHaveLength(1);
    expect(feedCalls[0].searchParams.get('careerId')).toBe(MEDICINA.id);
  });

  it('AC-6: una carrera que no está en la lista vuelve a "Para ti"', async () => {
    signIn();
    renderWithProviders(<FeedScreen />, { route: '/home?carrera=inventada' });

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Para ti' })).toHaveAttribute(
        'aria-current',
        'page',
      ),
    );
    expect(await screen.findByText(/tu feed está vacío/i)).toBeInTheDocument();
  });

  it('AC-9: si la primera página falla, "Reintentar" la vuelve a pedir', async () => {
    const user = userEvent.setup();
    let fail = true;
    signIn((url) => {
      if (!url.pathname.endsWith('/posts/feed')) return undefined;
      if (fail) return json(503, { statusCode: 503, code: 'UNAVAILABLE' });
      return page([postView({ id: 'ok' })]);
    });
    renderWithProviders(<FeedScreen />, { route: '/home' });

    expect(
      await screen.findByText('Algo salió mal. Intenta de nuevo.'),
    ).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findByTestId('post-ok')).toBeInTheDocument();
  });
});
