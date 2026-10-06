import { describe, it, expect } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreatePostScreen } from './CreatePostScreen';
import { FeedScreen } from './FeedScreen';
import { Toaster } from './ui/sonner';
import { renderRoutes } from '../../test/utils';
import { page, postView, signIn, TEST_USER } from '../../test/api';
import { json } from '../../test/setup';
import type { PostView } from '../lib/posts-api';

// Subida de archivos desde el compositor (spec 0008, decisión 13).
const KEY = 'image/0192f0c4-7d1a-4c3e-9a51-3c2b8e1f4a10.png';
const URL_SAS = `https://blob.test/media/${KEY}?sas`;

function fakeApi(uploadStatus = 201) {
  const posts: PostView[] = [];
  const bodies: { content: string; mediaKeys?: string[] }[] = [];
  let uploads = 0;
  signIn(async (url, init) => {
    if (url.pathname.endsWith('/uploads') && init?.method === 'POST') {
      uploads += 1;
      expect(init.body).toBeInstanceOf(FormData);
      if (uploadStatus !== 201) {
        return json(uploadStatus, {
          statusCode: uploadStatus,
          message: 'x',
          code: 'UNSUPPORTED_MEDIA_TYPE',
        });
      }
      return json(201, {
        key: KEY,
        url: URL_SAS,
        mediaType: 'IMAGE',
        mimeType: 'image/png',
        sizeBytes: 8,
      });
    }
    if (url.pathname.endsWith('/posts') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as (typeof bodies)[number];
      bodies.push(body);
      const created = postView({
        id: 'con-foto',
        content: body.content,
        media: (body.mediaKeys ?? []).map(() => ({
          url: URL_SAS,
          mediaType: 'IMAGE' as const,
          mimeType: 'image/png',
        })),
        author: { id: TEST_USER.id },
      });
      posts.unshift(created);
      return json(201, created);
    }
    if (url.pathname.endsWith('/posts/feed')) return page(posts);
    return undefined;
  });
  return { bodies, uploadCount: () => uploads };
}

const renderComposer = () =>
  renderRoutes(
    [
      {
        path: '/create-post',
        element: (
          <>
            <CreatePostScreen />
            <Toaster />
          </>
        ),
      },
      { path: '/home', element: <FeedScreen /> },
    ],
    { route: '/create-post' },
  );

const png = () =>
  new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'foto.png', {
    type: 'image/png',
  });

const choose = (file: File) =>
  fireEvent.change(screen.getByTestId('media-input'), {
    target: { files: [file] },
  });

describe('Spec 0008 decisión 13 — Adjuntar archivos al publicar', () => {
  it('un archivo válido se sube, se ve con el enlace de la API y sale en el feed', async () => {
    const user = userEvent.setup();
    const { bodies } = fakeApi();
    renderComposer();

    choose(png());
    const preview = await screen.findByAltText('Archivo adjunto 1');
    expect(preview).toHaveAttribute('src', URL_SAS);

    await user.type(
      screen.getByLabelText(/texto de la publicación/i),
      'Mi foto',
    );
    await user.click(screen.getByRole('button', { name: /^publicar$/i }));

    await screen.findByAltText('Imagen 1 de la publicación');
    expect(bodies[0]).toEqual({ content: 'Mi foto', mediaKeys: [KEY] });
  });

  it('un formato no soportado no se sube y el aviso lista los formatos permitidos', async () => {
    const { uploadCount } = fakeApi();
    renderComposer();

    choose(new File(['MZ'], 'virus.exe', { type: 'application/x-msdownload' }));

    expect(
      await screen.findByText(/JPG, PNG, WebP o GIF.*MP4 o WebM.*PDF/),
    ).toBeInTheDocument();
    expect(uploadCount()).toBe(0);
  });

  it('si la API rechaza el tipo por sus bytes, muestra los formatos permitidos', async () => {
    fakeApi(415);
    renderComposer();

    choose(png());

    expect(
      await screen.findByText(/Ese formato no se puede subir/),
    ).toBeInTheDocument();
    expect(screen.queryByAltText('Archivo adjunto 1')).not.toBeInTheDocument();
  });

  it('quitar un adjunto lo saca de la publicación', async () => {
    const user = userEvent.setup();
    const { bodies } = fakeApi();
    renderComposer();

    choose(png());
    await screen.findByAltText('Archivo adjunto 1');
    await user.click(screen.getByRole('button', { name: 'Quitar archivo 1' }));
    await user.type(
      screen.getByLabelText(/texto de la publicación/i),
      'Sin foto',
    );
    await user.click(screen.getByRole('button', { name: /^publicar$/i }));

    await waitFor(() => expect(bodies).toHaveLength(1));
    expect(bodies[0].mediaKeys).toBeUndefined();
  });
});
