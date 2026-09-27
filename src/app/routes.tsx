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
import { EditProfileScreen } from './components/EditProfileScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { UserProfileScreen } from './components/UserProfileScreen';
import { PeopleScreen } from './components/PeopleScreen';
import { SearchScreen } from './components/SearchScreen';
import { CreateStoryScreen } from './components/CreateStoryScreen';
import { StoryViewerScreen } from './components/StoryViewerScreen';
import { RequireAuth } from './components/RequireAuth';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    children: [
      { index: true, Component: SplashScreen },
      { path: 'login', Component: LoginScreen },
      { path: 'register', Component: RegisterScreen },
      { path: 'forgot-password', Component: ForgotPasswordScreen },
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
          { path: 'network', Component: PeopleScreen },
        ],
      },
    ],
  },
]);
