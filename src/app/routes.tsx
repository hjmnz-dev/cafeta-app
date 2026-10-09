import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { SplashScreen } from './components/SplashScreen';
import { FeedScreen } from './components/FeedScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { MessagesScreen } from './components/MessagesScreen';
import { LoginScreen } from './components/LoginScreen';
import { RegisterScreen } from './components/RegisterScreen';
import { CreatePostScreen } from './components/CreatePostScreen';
import { ForgotPasswordScreen } from './components/ForgotPasswordScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import { EditProfileScreen } from './components/EditProfileScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { UserProfileScreen } from './components/UserProfileScreen';
import { PeopleScreen } from './components/PeopleScreen';
import { SearchScreen } from './components/SearchScreen';
import { CreateStoryScreen } from './components/CreateStoryScreen';
import { StoryViewerScreen } from './components/StoryViewerScreen';
import { RequireAuth } from './components/RequireAuth';
import { ConversationScreen } from './components/ConversationScreen';
import { NetworkScreen } from './components/NetworkScreen';
import { FollowListScreen } from './components/FollowListScreen';
import { NotificationsScreen } from './components/NotificationsScreen';
import { PrivacyScreen, TermsScreen } from './components/LegalScreens';
import {
  RootErrorBoundary,
  ThrowOnRender,
} from './components/RootErrorBoundary';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    // Pantalla de error en español, también para rutas que no existen (spec 0007).
    ErrorBoundary: RootErrorBoundary,
    children: [
      { index: true, Component: SplashScreen },
      // Ruta oculta para probar el monitoreo (spec 0007); no aparece en ningún menú.
      { path: '__prueba-error', Component: ThrowOnRender },
      { path: 'login', Component: LoginScreen },
      { path: 'register', Component: RegisterScreen },
      { path: 'forgot-password', Component: ForgotPasswordScreen },
      // Enlace del correo de recuperación (spec 0008, decisión 10).
      { path: 'reset-password', Component: ResetPasswordScreen },
      // Textos legales: se leen sin iniciar sesión (spec 0009, decisión 12).
      { path: 'terms', Component: TermsScreen },
      { path: 'privacy', Component: PrivacyScreen },
      // Todo lo demás exige sesión (spec 0004).
      {
        Component: RequireAuth,
        children: [
          { path: 'profile/edit', Component: EditProfileScreen },
          { path: 'settings', Component: SettingsScreen },
          { path: 'home', Component: FeedScreen },
          // Enlace viejo: las pestañas de carrera viven en /home?carrera=<id>.
          { path: 'home/software', element: <Navigate to="/home" replace /> },
          { path: 'create-post', Component: CreatePostScreen },
          { path: 'profile', Component: ProfileScreen },
          { path: 'u/:userId', Component: UserProfileScreen },
          { path: 'messages', Component: MessagesScreen },
          { path: 'search', Component: SearchScreen },
          { path: 'create-story', Component: CreateStoryScreen },
          { path: 'stories/:storyId', Component: StoryViewerScreen },
          { path: 'discover', Component: PeopleScreen },
          // Mi red: seguidores, seguidos y solicitudes (decisión 16).
          { path: 'network', Component: NetworkScreen },
          { path: 'messages/:conversationId', Component: ConversationScreen },
          {
            path: 'u/:userId/followers',
            element: <FollowListScreen kind="followers" />,
          },
          {
            path: 'u/:userId/following',
            element: <FollowListScreen kind="following" />,
          },
          { path: 'notifications', Component: NotificationsScreen },
        ],
      },
    ],
  },
]);
