import { describe, it, expect, vi, afterEach } from 'vitest';

import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateStoryScreen } from './CreateStoryScreen';
import { StoryViewerScreen } from './StoryViewerScreen';
import { FeedScreen } from './FeedScreen';
import { ProfileScreen } from './ProfileScreen';
import { renderRoutes } from '../../test/utils';

/**
 * Las pruebas recorren la app como lo haría una persona: publican una historia
 * y la abren desde la tira del feed, en vez de inventar ids internos.
 */
function renderStoryFlow(route = '/create-story') {
  return renderRoutes(
    [
      { path: '/create-story', element: <CreateStoryScreen /> },
      { path: '/stories/:storyId', element: <StoryViewerScreen /> },
      { path: '/home', element: <FeedScreen /> },
    ],
    { route },
  );
}

/** HU12 + HU13: publica una historia propia y la abre desde el feed. */
async function publishAndOpen(
  user: ReturnType<typeof userEvent.setup>,
  text: string,
) {
  await user.type(
    screen.getByRole('textbox', { name: /texto de la historia/i }),
    text,
  );
  await user.click(screen.getByRole('button', { name: /publicar/i }));
  await user.click(
    screen.getByRole('link', { name: /ver historia de carlos gómez/i }),
  );
}

describe('DEF-04 · HU12/HU13 — Crear y ver historias', () => {
  it('HU12 — al publicar, la historia aparece en la tira del feed', async () => {
    const user = userEvent.setup();
    renderStoryFlow();

    await user.type(
      screen.getByRole('textbox', { name: /texto de la historia/i }),
      'Estudiando en la biblioteca',
    );
    await user.click(screen.getByRole('button', { name: /publicar/i }));

    expect(screen.getByTestId('location')).toHaveTextContent('/home');
    expect(
      screen.getByRole('link', { name: /ver historia de carlos gómez/i }),
    ).toBeInTheDocument();
  });

  it('HU12 — no se puede publicar una historia vacía', async () => {
    renderStoryFlow();

    expect(screen.getByRole('button', { name: /publicar/i })).toBeDisabled();
  });

  it('HU13 — sin seguir a nadie, la tira explica por qué no hay historias', () => {
    renderStoryFlow('/home');

    expect(screen.getByText(/sigue a alguien en/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /ver historia de/i }),
    ).not.toBeInTheDocument();
  });

  it('HU13 — el visor muestra el contenido y cuánto tiempo le queda', async () => {
    const user = userEvent.setup();
    renderStoryFlow();

    await publishAndOpen(user, 'Estudiando en la biblioteca');

    expect(screen.getByText('Estudiando en la biblioteca')).toBeInTheDocument();
    expect(screen.getByText(/quedan 23 h/i)).toBeInTheDocument();
  });
});

describe('DEF-04 · HU14/HU15 — Editar y desactivar historia', () => {
  it('HU14 — el autor edita su historia y queda marcada como editada', async () => {
    const user = userEvent.setup();
    renderStoryFlow();

    await publishAndOpen(user, 'Texto original');
    await user.click(screen.getByRole('button', { name: /editar historia/i }));

    const box = screen.getByRole('textbox', {
      name: /editar texto de la historia/i,
    });
    await user.clear(box);
    await user.type(box, 'Texto corregido');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(screen.getByText('Texto corregido')).toBeInTheDocument();
    expect(screen.queryByText('Texto original')).not.toBeInTheDocument();
    expect(screen.getByText(/editada/i)).toBeInTheDocument();
  });

  it('HU15 — desactivar retira la historia de la tira, previa confirmación', async () => {
    const user = userEvent.setup();
    renderStoryFlow();

    await publishAndOpen(user, 'Historia que voy a retirar');
    await user.click(
      screen.getByRole('button', { name: /desactivar historia/i }),
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^desactivar$/i }));

    expect(screen.getByTestId('location')).toHaveTextContent('/home');
    expect(
      screen.queryByRole('link', { name: /ver historia de/i }),
    ).not.toBeInTheDocument();
  });
});

describe('DEF-04 · HU16 — Reaccionar a historia', () => {
  it('la reacción se marca y se contabiliza; repetirla la retira', async () => {
    const user = userEvent.setup();
    renderStoryFlow();

    await publishAndOpen(user, 'Historia con reacciones');

    const heart = screen.getByRole('button', { name: /reaccionar con ❤️/i });
    await user.click(heart);

    expect(
      screen.getByRole('button', { name: /reaccionar con ❤️/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/❤️ 1/)).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /reaccionar con ❤️/i }),
    );

    expect(
      screen.getByRole('button', { name: /reaccionar con ❤️/i }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText(/❤️ 1/)).not.toBeInTheDocument();
  });

  it('una sola reacción por persona: elegir otra sustituye la anterior', async () => {
    const user = userEvent.setup();
    renderStoryFlow();

    await publishAndOpen(user, 'Historia con reacciones');

    await user.click(
      screen.getByRole('button', { name: /reaccionar con ❤️/i }),
    );
    await user.click(
      screen.getByRole('button', { name: /reaccionar con 🔥/i }),
    );

    expect(
      screen.getByRole('button', { name: /reaccionar con ❤️/i }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByRole('button', { name: /reaccionar con 🔥/i }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('DEF-04 · HU17/HU18/HU19 — Comentarios de historia', () => {
  it('HU17 — comentar añade el comentario a la historia', async () => {
    const user = userEvent.setup();
    renderStoryFlow();

    await publishAndOpen(user, 'Historia comentable');
    await user.type(
      screen.getByRole('textbox', { name: /escribe un comentario/i }),
      '¡Qué bueno!',
    );
    await user.click(
      screen.getByRole('button', { name: /enviar comentario/i }),
    );

    expect(screen.getByText('¡Qué bueno!')).toBeInTheDocument();
    expect(screen.getByText(/comentarios \(1\)/i)).toBeInTheDocument();
  });

  it('HU18 — el autor edita su comentario y queda marcado como editado', async () => {
    const user = userEvent.setup();
    renderStoryFlow();

    await publishAndOpen(user, 'Historia comentable');
    await user.type(
      screen.getByRole('textbox', { name: /escribe un comentario/i }),
      'Comentario con herror',
    );
    await user.click(
      screen.getByRole('button', { name: /enviar comentario/i }),
    );

    await user.click(
      screen.getByRole('button', { name: /editar comentario de/i }),
    );
    const box = screen.getByRole('textbox', { name: /^editar comentario$/i });
    await user.clear(box);
    await user.type(box, 'Comentario con error');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(screen.getByText('Comentario con error')).toBeInTheDocument();
    expect(screen.getByText(/· Editado/)).toBeInTheDocument();
  });

  it('HU19 — desactivar un comentario propio lo retira de la vista', async () => {
    const user = userEvent.setup();
    renderStoryFlow();

    await publishAndOpen(user, 'Historia comentable');
    await user.type(
      screen.getByRole('textbox', { name: /escribe un comentario/i }),
      'Mejor lo retiro',
    );
    await user.click(
      screen.getByRole('button', { name: /enviar comentario/i }),
    );

    await user.click(
      screen.getByRole('button', { name: /desactivar comentario de/i }),
    );

    expect(screen.queryByText('Mejor lo retiro')).not.toBeInTheDocument();
    expect(screen.getByText(/comentarios \(0\)/i)).toBeInTheDocument();
  });
});

describe('DEF-04 · HU13 — Reproducción automática de historias', () => {
  // `shouldAdvanceTime` deja correr el tiempo real de fondo, que es lo que
  // necesita userEvent para escribir y hacer clic con temporizadores falsos.
  afterEach(() => vi.useRealTimers());

  /** Publica y abre una historia con el reloj bajo control de la prueba. */
  async function abrirConRelojFalso() {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    renderStoryFlow();
    await publishAndOpen(user, 'Historia con tiempo');
    return user;
  }

  it('la historia dura 10 s y, si no queda ninguna otra, el visor se cierra solo', async () => {
    await abrirConRelojFalso();
    expect(screen.getByText('Historia con tiempo')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByTestId('location')).toHaveTextContent('/home');
  });

  it('escribir un comentario pausa el temporizador: no se cierra debajo de la mano', async () => {
    const user = await abrirConRelojFalso();

    await user.type(
      screen.getByRole('textbox', { name: /escribe un comentario/i }),
      'Estoy escribiendo',
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(screen.getByText('Historia con tiempo')).toBeInTheDocument();
    expect(screen.getByTestId('location')).not.toHaveTextContent('/home');
  });

  it('con una sola historia del autor, la barra tiene una sola franja', async () => {
    const user = userEvent.setup();
    renderStoryFlow();

    await publishAndOpen(user, 'Historia única');

    expect(screen.getByText('1 de 1')).toBeInTheDocument();
  });
});

describe('DEF-04 · HU12/HU13 — "Tu historia" es un solo círculo', () => {
  it('al publicar no aparece un círculo nuevo: el propio pasa a tener anillo', async () => {
    const user = userEvent.setup();
    renderStoryFlow();

    await user.type(
      screen.getByRole('textbox', { name: /texto de la historia/i }),
      'Mi historia del día',
    );
    await user.click(screen.getByRole('button', { name: /^publicar$/i }));

    // Un único elemento "Tu historia", y ahora abre la historia publicada.
    expect(screen.getAllByText('Tu historia')).toHaveLength(1);
    expect(
      screen.getByRole('link', { name: /ver historia de carlos gómez/i }),
    ).toBeInTheDocument();
    // Y no se duplica como un círculo más con el nombre propio.
    expect(screen.queryByText('Carlos')).not.toBeInTheDocument();
  });

  it('el "+" sigue llevando a crear otra historia', async () => {
    const user = userEvent.setup();
    renderStoryFlow();

    await user.type(
      screen.getByRole('textbox', { name: /texto de la historia/i }),
      'Mi historia del día',
    );
    await user.click(screen.getByRole('button', { name: /^publicar$/i }));

    await user.click(screen.getByRole('link', { name: /crear historia/i }));

    expect(screen.getByTestId('location')).toHaveTextContent('/create-story');
  });

  it('sin historia propia, tocar el círculo lleva a crearla', () => {
    renderStoryFlow('/home');

    expect(
      screen.getByRole('link', { name: /crear historia/i }),
    ).toHaveAttribute('href', '/create-story');
    expect(
      screen.queryByRole('link', { name: /ver historia de/i }),
    ).not.toBeInTheDocument();
  });
});

describe('DEF-04 · HU13 — Cerrar devuelve a la pantalla desde la que se abrió', () => {
  /** Feed y perfil comparten el visor: la salida depende de por dónde se entró. */
  function renderConPerfil(route: string) {
    return renderRoutes(
      [
        { path: '/create-story', element: <CreateStoryScreen /> },
        { path: '/stories/:storyId', element: <StoryViewerScreen /> },
        { path: '/home', element: <FeedScreen /> },
        { path: '/profile', element: <ProfileScreen /> },
      ],
      { route },
    );
  }

  it('abierta desde el perfil, al cerrar vuelve al perfil', async () => {
    const user = userEvent.setup();
    renderConPerfil('/profile');

    // Publicar desde el perfil también devuelve al perfil.
    await user.click(screen.getByRole('link', { name: /crear historia/i }));
    await user.type(
      screen.getByRole('textbox', { name: /texto de la historia/i }),
      'Historia desde el perfil',
    );
    await user.click(screen.getByRole('button', { name: /^publicar$/i }));
    expect(screen.getByTestId('location')).toHaveTextContent('/profile');

    await user.click(
      screen.getByRole('link', { name: /ver historia de carlos gómez/i }),
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/stories/');

    await user.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(screen.getByTestId('location')).toHaveTextContent('/profile');
  });

  it('abierta desde el feed, al cerrar vuelve al feed', async () => {
    const user = userEvent.setup();
    renderConPerfil('/create-story');

    await user.type(
      screen.getByRole('textbox', { name: /texto de la historia/i }),
      'Historia desde el feed',
    );
    await user.click(screen.getByRole('button', { name: /^publicar$/i }));
    await user.click(
      screen.getByRole('link', { name: /ver historia de carlos gómez/i }),
    );

    await user.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(screen.getByTestId('location')).toHaveTextContent('/home');
  });

  it('al vencer el tiempo también vuelve al perfil, no al feed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({
        advanceTimers: vi.advanceTimersByTime.bind(vi),
      });
      renderConPerfil('/profile');

      await user.click(screen.getByRole('link', { name: /crear historia/i }));
      await user.type(
        screen.getByRole('textbox', { name: /texto de la historia/i }),
        'Historia con tiempo',
      );
      await user.click(screen.getByRole('button', { name: /^publicar$/i }));
      await user.click(
        screen.getByRole('link', { name: /ver historia de carlos gómez/i }),
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });

      expect(screen.getByTestId('location')).toHaveTextContent('/profile');
    } finally {
      vi.useRealTimers();
    }
  });
});
