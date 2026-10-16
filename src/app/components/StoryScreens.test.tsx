import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, useNavigate } from 'react-router';
import { json } from '../../test/setup';
import { signIn, TEST_USER, type Handler } from '../../test/api';
import { renderRoutes, renderWithProviders } from '../../test/utils';
import type { StoryGroup, StoryView } from '../lib/stories-api';
import { CreateStoryScreen } from './CreateStoryScreen';
import { MyStoryAvatar } from './MyStoryAvatar';
import { StoriesStrip } from './StoriesStrip';
import { StoryViewerScreen } from './StoryViewerScreen';
import { Toaster } from './ui/sonner';

// Crear y ver historias contra la API con fetch simulado (spec 0008, decisión 22;
// HU12 y HU13). La API real decide qué entra en la bandeja: aquí solo se prueba
// cómo la dibuja la web.
const HOUR = 60 * 60 * 1000;

const story = (id: string, overrides: Partial<StoryView> = {}): StoryView => ({
  id,
  text: null,
  editedAt: null,
  myReaction: null,
  reactionCount: null,
  commentCount: 0,
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

const isTrayRequest = (url: URL, init?: RequestInit) =>
  url.pathname.endsWith('/stories') && (init?.method ?? 'GET') === 'GET';

/** La bandeja responde con los grupos que devuelva `groups()` en cada petición. */
const trayOf =
  (groups: () => StoryGroup[]): Handler =>
  (url, init) =>
    isTrayRequest(url, init) ? json(200, { groups: groups() }) : undefined;

describe('HU13 · Tira de historias del feed', () => {
  it('HU13 E1: muestra a quienes sigo con su historia vigente, y cada uno abre la suya', async () => {
    signIn(trayOf(() => [group(BETO, [story('b1'), story('b2')])]));
    renderWithProviders(<StoriesStrip />, { route: '/home' });

    const link = await screen.findByRole('link', {
      name: 'Ver historia de Beto Ramírez',
    });
    expect(link).toHaveAttribute('href', '/stories/b1');
    expect(screen.getByText('Beto')).toBeInTheDocument();
  });

  it('sin historias de otros, explica por qué y sugiere publicar la propia', async () => {
    signIn(trayOf(() => []));
    renderWithProviders(<StoriesStrip />, { route: '/home' });

    expect(
      await screen.findByText(/para ver sus historias, o publica la tuya\./i),
    ).toBeInTheDocument();
  });

  it('con historia propia y sin otras, la sugerencia ya no pide publicar', async () => {
    signIn(trayOf(() => [group(ME, [story('m1')])]));
    renderWithProviders(<StoriesStrip />, { route: '/home' });

    const hint = await screen.findByText(/para ver sus historias\./i);
    expect(hint.textContent).not.toMatch(/publica la tuya/i);
  });

  it('si la bandeja falla, avisa y deja reintentar', async () => {
    const user = userEvent.setup();
    let fail = true;
    signIn((url, init) => {
      if (!isTrayRequest(url, init)) return undefined;
      return fail
        ? json(500, { statusCode: 500, code: 'INTERNAL_SERVER_ERROR' })
        : json(200, { groups: [group(BETO, [story('b1')])] });
    });
    renderWithProviders(<StoriesStrip />, { route: '/home' });

    expect(
      await screen.findByText('No pudimos cargar las historias.'),
    ).toBeInTheDocument();

    fail = false;
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(
      await screen.findByRole('link', { name: 'Ver historia de Beto Ramírez' }),
    ).toBeInTheDocument();
  });
});

describe('HU12/HU13 · "Tu historia" es un solo círculo', () => {
  it('sin historia propia, tocar el círculo lleva a crearla', async () => {
    signIn(trayOf(() => []));
    renderWithProviders(<MyStoryAvatar />, { route: '/home' });

    const link = await screen.findByRole('link', { name: 'Crear historia' });
    expect(link).toHaveAttribute('href', '/create-story');
  });

  it('con historia propia, el círculo la abre y el "+" sigue llevando a crear otra', async () => {
    signIn(trayOf(() => [group(ME, [story('m1')])]));
    renderWithProviders(<MyStoryAvatar />, { route: '/home' });

    expect(
      await screen.findByRole('link', { name: 'Ver historia de Carlos Gómez' }),
    ).toHaveAttribute('href', '/stories/m1');
    expect(
      screen.getByRole('link', { name: 'Crear historia' }),
    ).toHaveAttribute('href', '/create-story');
  });
});

/** Un enlace de salida que abre el visor "desde" otra pantalla, como el perfil. */
function OpenFrom({ from, to }: { from: string; to: string }) {
  return (
    <Link to={to} state={{ from }}>
      abrir
    </Link>
  );
}

function renderViewer(groups: StoryGroup[], to = '/stories/b1') {
  signIn(trayOf(() => groups));
  return renderRoutes(
    [
      { path: '/stories/:storyId', element: <StoryViewerScreen /> },
      { path: '/home', element: <p>feed</p> },
      { path: '/profile', element: <OpenFrom from="/profile" to={to} /> },
    ],
    { route: to },
  );
}

describe('HU13 · Ver una historia', () => {
  it('muestra el medio, el texto, cuánto le queda y quién la publicó', async () => {
    renderViewer([
      group(BETO, [story('b1', { text: 'Hoy hay feria en el campus' })]),
    ]);

    expect(await screen.findByText('Hoy hay feria en el campus')).toBeVisible();
    expect(screen.getByText('Beto Ramírez')).toBeInTheDocument();
    expect(screen.getByText('Quedan 5 h')).toBeInTheDocument();
    expect(
      document.querySelector('img[src="https://blob.test/b1.jpg"]'),
    ).not.toBeNull();
  });

  it('una historia editada lo dice', async () => {
    renderViewer([
      group(BETO, [story('b1', { editedAt: new Date().toISOString() })]),
    ]);

    expect(await screen.findByText(/· Editada/)).toBeInTheDocument();
  });

  it('un video se reproduce y su sonido se activa a mano', async () => {
    const user = userEvent.setup();
    renderViewer([
      group(BETO, [
        story('b1', {
          media: {
            mediaType: 'VIDEO',
            url: 'https://blob.test/b1.mp4',
            mimeType: 'video/mp4',
          },
        }),
      ]),
    ]);

    await screen.findByText('Beto Ramírez');
    expect(
      document.querySelector('video[src="https://blob.test/b1.mp4"]'),
    ).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Activar sonido' }));
    expect(
      screen.getByRole('button', { name: 'Silenciar' }),
    ).toBeInTheDocument();
  });

  it('HU13 E2: una historia que ya no está en la bandeja (vencida o desactivada) no se muestra', async () => {
    renderViewer([group(BETO, [story('b2')])], '/stories/b1');

    expect(
      await screen.findByText('Esta historia ya no está disponible.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Las historias se muestran solo durante 24 horas.'),
    ).toBeInTheDocument();
  });

  it('con varias del mismo autor, la barra las cuenta y se avanza y retrocede entre ellas', async () => {
    const user = userEvent.setup();
    renderViewer([
      group(BETO, [story('b1'), story('b2')]),
      group(ME, [story('m1')]),
    ]);

    expect(await screen.findByText('1 de 2')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Historia anterior' }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole('button', { name: 'Historia siguiente' }),
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/stories/b2');
    expect(await screen.findByText('2 de 2')).toBeInTheDocument();

    // El tramo es del autor, pero la cola sigue con el siguiente autor.
    await user.click(
      screen.getByRole('button', { name: 'Historia siguiente' }),
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/stories/m1');
    expect(await screen.findByText('1 de 1')).toBeInTheDocument();
  });

  it('Cerrar vuelve al feed por defecto', async () => {
    const user = userEvent.setup();
    renderViewer([group(BETO, [story('b1')])]);

    await user.click(await screen.findByRole('button', { name: 'Cerrar' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/home');
  });

  it('abierta desde el perfil, Cerrar vuelve al perfil', async () => {
    const user = userEvent.setup();
    signIn(trayOf(() => [group(BETO, [story('b1')])]));
    renderRoutes(
      [
        { path: '/stories/:storyId', element: <StoryViewerScreen /> },
        {
          path: '/profile',
          element: <OpenFrom from="/profile" to="/stories/b1" />,
        },
      ],
      { route: '/profile' },
    );

    await user.click(screen.getByRole('link', { name: 'abrir' }));
    await user.click(await screen.findByRole('button', { name: 'Cerrar' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/profile');
  });
});

describe('HU13 · Reproducción automática', () => {
  // `shouldAdvanceTime` deja correr el tiempo real de fondo, que necesitan
  // userEvent y las promesas de la API simulada con temporizadores falsos.
  afterEach(() => vi.useRealTimers());

  it('la historia dura 10 s y, si no queda ninguna otra, el visor se cierra solo', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderViewer([group(BETO, [story('b1', { text: 'Con tiempo' })])]);
    expect(await screen.findByText('Con tiempo')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByTestId('location')).toHaveTextContent('/home');
  });

  it('con otra historia por ver, pasa sola a la siguiente', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderViewer([group(BETO, [story('b1'), story('b2')])]);
    expect(await screen.findByText('1 de 2')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByTestId('location')).toHaveTextContent('/stories/b2');
  });

  it('al vencer el tiempo vuelve a la pantalla desde la que se abrió', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
    signIn(
      trayOf(() => [group(BETO, [story('b1', { text: 'Desde el perfil' })])]),
    );
    renderRoutes(
      [
        { path: '/stories/:storyId', element: <StoryViewerScreen /> },
        {
          path: '/profile',
          element: <OpenFrom from="/profile" to="/stories/b1" />,
        },
      ],
      { route: '/profile' },
    );
    await user.click(screen.getByRole('link', { name: 'abrir' }));
    expect(await screen.findByText('Desde el perfil')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(screen.getByTestId('location')).toHaveTextContent('/profile');
  });
});

const UPLOADED = {
  mediaType: 'IMAGE',
  key: 'image/0192f0c4-7d1a-7c3e-9a51-3c2b8e1f4a10.jpg',
  url: 'https://blob.test/preview.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1000,
};

describe('HU12 · Crear una historia', () => {
  /** Sube y publica con las respuestas indicadas; guarda lo que mandó la web. */
  function renderCreate(
    handler: Handler = () => undefined,
    route = '/create-story',
  ) {
    const sent: { upload?: FormData; story?: unknown } = {};
    const fetchMock = signIn(async (url, init) => {
      if (url.pathname.endsWith('/uploads') && init?.method === 'POST') {
        sent.upload = init.body as FormData;
        return json(201, UPLOADED);
      }
      if (isStoryCreate(url, init)) {
        sent.story = JSON.parse(String(init?.body));
      }
      return handler(url, init);
    });
    renderRoutes(
      [
        {
          path: '/create-story',
          element: (
            <>
              <CreateStoryScreen />
              <Toaster />
            </>
          ),
        },
        { path: '/home', element: <p>feed</p> },
      ],
      { route },
    );
    return { sent, fetchMock };
  }

  const isStoryCreate = (url: URL, init?: RequestInit) =>
    url.pathname.endsWith('/stories') && init?.method === 'POST';

  const photo = () => new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
  const publishButton = () =>
    screen.getByRole('button', { name: /^publicar/i });

  it('avisa que dura 24 horas y no deja publicar sin imagen o video, aunque haya texto', async () => {
    const user = userEvent.setup();
    renderCreate();

    expect(screen.getByText('24 horas')).toBeInTheDocument();
    await user.type(
      screen.getByRole('textbox', { name: /texto de la historia/i }),
      'Solo texto',
    );

    expect(publishButton()).toBeDisabled();
  });

  it('HU12 E1: al elegir una imagen la sube, muestra la vista previa y permite publicar con su clave y el texto', async () => {
    const user = userEvent.setup();
    const { sent } = renderCreate((url, init) =>
      isStoryCreate(url, init) ? json(201, story('nueva')) : undefined,
    );

    await user.upload(screen.getByLabelText('Archivo de la historia'), photo());
    expect(
      await screen.findByAltText('Vista previa de la historia'),
    ).toHaveAttribute('src', UPLOADED.url);
    const uploaded = sent.upload?.get('file');
    expect(uploaded instanceof File && uploaded.name).toBe('foto.jpg');

    await user.type(
      screen.getByRole('textbox', { name: /texto de la historia/i }),
      '  Feria hoy  ',
    );
    await user.click(publishButton());

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/home'),
    );
    expect(sent.story).toEqual({ mediaKey: UPLOADED.key, text: 'Feria hoy' });
  });

  it('el texto es opcional: sin él se publica solo con el archivo', async () => {
    const user = userEvent.setup();
    const { sent } = renderCreate((url, init) =>
      isStoryCreate(url, init) ? json(201, story('nueva')) : undefined,
    );

    await user.upload(screen.getByLabelText('Archivo de la historia'), photo());
    await screen.findByAltText('Vista previa de la historia');
    await user.click(publishButton());

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/home'),
    );
    expect(sent.story).toEqual({ mediaKey: UPLOADED.key });
  });

  it('se puede quitar el archivo y la historia deja de poder publicarse', async () => {
    const user = userEvent.setup();
    renderCreate();

    await user.upload(screen.getByLabelText('Archivo de la historia'), photo());
    await screen.findByAltText('Vista previa de la historia');
    expect(publishButton()).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Quitar archivo' }));

    expect(screen.queryByAltText('Vista previa de la historia')).toBeNull();
    expect(publishButton()).toBeDisabled();
  });

  it('un formato que no se puede subir se rechaza sin llamar a la API', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const { fetchMock } = renderCreate();

    await user.upload(
      screen.getByLabelText('Archivo de la historia'),
      new File(['x'], 'foto.bmp', { type: 'image/bmp' }),
    );

    expect(
      await screen.findByText(/Ese formato no se puede subir/),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([input]) =>
        String(input).endsWith('/uploads'),
      ),
    ).toBe(false);
  });

  it('HU12 E2: un PDF no es una historia: dice que lleva imagen o video', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderCreate();

    await user.upload(
      screen.getByLabelText('Archivo de la historia'),
      new File(['x'], 'apuntes.pdf', { type: 'application/pdf' }),
    );

    expect(
      await screen.findByText('Una historia lleva una imagen o un video.'),
    ).toBeInTheDocument();
  });

  it('el texto tiene tope de 280 caracteres y lo cuenta', async () => {
    const user = userEvent.setup();
    renderCreate();
    await user.upload(screen.getByLabelText('Archivo de la historia'), photo());
    await screen.findByAltText('Vista previa de la historia');

    await user.click(
      screen.getByRole('textbox', { name: /texto de la historia/i }),
    );
    await user.paste('a'.repeat(281));

    expect(screen.getByText('281/280')).toBeInTheDocument();
    expect(publishButton()).toBeDisabled();
  });

  it('si la API rechaza la historia, avisa en español y no sale de la pantalla', async () => {
    const user = userEvent.setup();
    renderCreate((url, init) =>
      isStoryCreate(url, init)
        ? json(400, { statusCode: 400, code: 'STORY_MEDIA_INVALID' })
        : undefined,
    );
    await user.upload(screen.getByLabelText('Archivo de la historia'), photo());
    await screen.findByAltText('Vista previa de la historia');

    await user.click(publishButton());

    expect(
      await screen.findByText('Una historia lleva una imagen o un video.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/create-story');
  });
});

describe('Bug 1058 · Cerrar una historia vuelve atrás sin bucle', () => {
  function BackButton() {
    const navigate = useNavigate();
    return (
      <button onClick={() => navigate(-1)} aria-label="Atrás">
        Atrás
      </button>
    );
  }

  it('Inicio → Buscar → historia → cerrar → Atrás llega a Inicio', async () => {
    const user = userEvent.setup();
    signIn(trayOf(() => [group(BETO, [story('b1'), story('b2')])]));
    renderRoutes(
      [
        {
          path: '/home',
          element: <Link to="/search">Ir a buscar</Link>,
        },
        {
          path: '/search',
          element: (
            <>
              <BackButton />
              <Link to="/stories/b1" state={{ from: '/search' }}>
                Ver historia
              </Link>
            </>
          ),
        },
        { path: '/stories/:storyId', element: <StoryViewerScreen /> },
      ],
      { route: '/home' },
    );

    await user.click(screen.getByRole('link', { name: 'Ir a buscar' }));
    await user.click(screen.getByRole('link', { name: 'Ver historia' }));
    // Pasar a la siguiente historia no suma entradas al historial.
    await user.click(
      await screen.findByRole('button', { name: 'Historia siguiente' }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/stories/b2'),
    );
    await user.click(screen.getByRole('button', { name: 'Cerrar' }));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/search'),
    );

    await user.click(screen.getByRole('button', { name: 'Atrás' }));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/home'),
    );
  });
});
