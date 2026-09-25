import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessagesScreen } from './MessagesScreen';
import { FeedScreen } from './FeedScreen';
import { renderWithProviders } from '../../test/utils';

/** Abre la conversación con María, que es la que trae hilo de demostración. */
async function openChat(user: ReturnType<typeof userEvent.setup>) {
  renderWithProviders(<MessagesScreen />, { route: '/messages' });
  await user.click(screen.getByRole('button', { name: /maría rodríguez/i }));
}

describe('DEF-06 · HU36/HU37 — Editar y retirar mensajes', () => {
  it('HU35 — enviar un mensaje lo agrega a la conversación', async () => {
    const user = userEvent.setup();
    await openChat(user);

    await user.type(
      screen.getByRole('textbox', { name: /escribe un mensaje/i }),
      'Te los paso ahora mismo',
    );
    await user.click(screen.getByRole('button', { name: /enviar mensaje/i }));

    expect(screen.getByText('Te los paso ahora mismo')).toBeInTheDocument();
  });

  it('HU36 — el autor edita su mensaje y queda marcado como editado', async () => {
    const user = userEvent.setup();
    await openChat(user);

    await user.click(
      screen.getByRole('button', {
        name: /editar mensaje: sí claro, te los comparto/i,
      }),
    );
    const box = screen.getByRole('textbox', { name: /^editar mensaje$/i });
    await user.clear(box);
    await user.type(box, 'Sí claro, te los comparto esta tarde');
    await user.click(
      screen.getByRole('button', { name: /guardar cambios del mensaje/i }),
    );

    expect(
      screen.getByText('Sí claro, te los comparto esta tarde'),
    ).toBeInTheDocument();
    expect(screen.getByText(/· Editado/)).toBeInTheDocument();
  });

  it('HU36 — solo se pueden editar los mensajes propios', async () => {
    const user = userEvent.setup();
    await openChat(user);

    // Mensaje recibido: sin acciones de autor.
    expect(screen.getByText('Hola Carlos! ¿Cómo estás?')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /editar mensaje: hola carlos/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /retirar mensaje: hola carlos/i }),
    ).not.toBeInTheDocument();
  });

  it('HU37 — retirar un mensaje lo saca de la conversación y de la vista previa', async () => {
    const user = userEvent.setup();
    await openChat(user);

    await user.click(
      screen.getByRole('button', {
        name: /retirar mensaje: sí claro, te los comparto/i,
      }),
    );

    expect(
      screen.queryByText('Sí claro, te los comparto por aquí'),
    ).not.toBeInTheDocument();

    // De vuelta en la lista, la conversación ya no anuncia el mensaje retirado.
    await user.click(
      screen.getByRole('button', { name: /volver a conversaciones/i }),
    );
    expect(
      screen.queryByText('Sí claro, te los comparto por aquí'),
    ).not.toBeInTheDocument();
  });
});

describe('DEF-06 · HU28 — Reaccionar a publicación', () => {
  it('reaccionar marca la publicación y suma al conteo; repetir la retira', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FeedScreen />, { route: '/home' });

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
    renderWithProviders(<FeedScreen />, { route: '/home' });

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
