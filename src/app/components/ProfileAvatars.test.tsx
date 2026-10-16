import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { signIn, TEST_USER } from '../../test/api';
import { json } from '../../test/setup';
import { AccountInfo } from './AccountInfo';
import { AppLayout } from './AppLayout';
import { CreatePostScreen } from './CreatePostScreen';
import { CreateStoryScreen } from './CreateStoryScreen';
import { FollowUserRow } from './FollowUserList';
import { MessagesScreen } from './MessagesScreen';
import { NotificationsScreen } from './NotificationsScreen';
import { ProfileAvatar } from './ProfileAvatar';

// Bug 1072: donde hay un avatar sale la foto de la persona; la inicial queda
// para quien no tiene foto o si la foto no carga.
const MY_PHOTO = 'https://blob.test/image/yo.jpg';
const BETO_PHOTO = 'https://blob.test/image/beto.jpg';
const BETO = {
  id: '01926f00-0000-7000-8000-0000000000b0',
  handle: 'beto',
  displayName: 'Beto Díaz',
};

const photo = (url: string) => document.querySelector(`img[src="${url}"]`);

/** Sesión con foto propia, más lo que responda cada prueba. */
function signInWithPhoto(
  handler: (url: URL, init?: RequestInit) => Response | undefined = () =>
    undefined,
) {
  return signIn((url, init) =>
    url.pathname.endsWith('/auth/me')
      ? json(200, {
          ...TEST_USER,
          profile: { ...TEST_USER.profile, avatarUrl: MY_PHOTO },
        })
      : handler(url, init),
  );
}

describe('Bug 1072 · Foto de perfil en todos los avatares', () => {
  it('si la foto no carga, sale la inicial', () => {
    render(<ProfileAvatar url={BETO_PHOTO} name="Beto Díaz" size={40} />);
    const img = photo(BETO_PHOTO);
    expect(img).not.toBeNull();
    fireEvent.error(img!);
    expect(photo(BETO_PHOTO)).toBeNull();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('crear historia muestra mi foto junto al texto', async () => {
    signInWithPhoto();
    renderWithProviders(<CreateStoryScreen />, { route: '/create-story' });
    await waitFor(() => expect(photo(MY_PHOTO)).not.toBeNull());
  });

  it('crear publicación muestra mi foto', async () => {
    signInWithPhoto();
    renderWithProviders(<CreatePostScreen />, { route: '/create-post' });
    await waitFor(() => expect(photo(MY_PHOTO)).not.toBeNull());
  });

  it('la pestaña de perfil de la barra inferior muestra mi foto', async () => {
    signInWithPhoto();
    renderWithProviders(<AppLayout />, { route: '/home' });
    await waitFor(() => expect(photo(MY_PHOTO)).not.toBeNull());
  });

  it('Configuración · Cuenta muestra mi foto', () => {
    renderWithProviders(
      <AccountInfo
        user={{
          ...TEST_USER,
          profile: { ...TEST_USER.profile, avatarUrl: MY_PHOTO },
        }}
        sectionTitle=""
        card=""
      />,
    );
    expect(photo(MY_PHOTO)).not.toBeNull();
  });

  it('la bandeja de mensajes muestra la foto de la otra persona', async () => {
    signInWithPhoto((url) =>
      url.pathname.endsWith('/conversations')
        ? json(200, {
            items: [
              {
                id: 'c1',
                otherUser: {
                  ...BETO,
                  avatarUrl: BETO_PHOTO,
                  careerName: null,
                  verified: false,
                },
                lastMessage: null,
                unread: false,
              },
            ],
            nextCursor: null,
          })
        : undefined,
    );
    renderWithProviders(<MessagesScreen />, { route: '/messages' });
    await waitFor(() => expect(photo(BETO_PHOTO)).not.toBeNull());
  });

  it('una notificación muestra la foto de quien la generó', async () => {
    signInWithPhoto((url) =>
      url.pathname.endsWith('/notifications')
        ? json(200, {
            items: [
              {
                id: 'n1',
                type: 'FOLLOW',
                actor: { ...BETO, avatarUrl: BETO_PHOTO },
                postId: null,
                storyId: null,
                conversationId: null,
                read: true,
                createdAt: new Date().toISOString(),
              },
            ],
            nextCursor: null,
          })
        : undefined,
    );
    renderWithProviders(<NotificationsScreen />, { route: '/notifications' });
    await waitFor(() => expect(photo(BETO_PHOTO)).not.toBeNull());
  });

  it('seguidores y seguidos muestran la foto de cada persona', () => {
    renderWithProviders(
      <FollowUserRow
        user={{
          ...BETO,
          avatarUrl: BETO_PHOTO,
          careerName: null,
          verified: false,
        }}
      />,
    );
    expect(photo(BETO_PHOTO)).not.toBeNull();
  });
});
