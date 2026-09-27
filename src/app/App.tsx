import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AppStateProvider } from './store/AppState';
import { SessionProvider } from './store/SessionStore';

function App() {
  return (
    <SessionProvider>
      <AppStateProvider>
        <RouterProvider router={router} />
      </AppStateProvider>
    </SessionProvider>
  );
}

export default App;
