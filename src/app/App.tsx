import { RouterProvider } from 'react-router';
import { Toaster } from './components/ui/sonner';
import { router } from './routes';
import { AppStateProvider } from './store/AppState';
import { QueryProvider } from './store/QueryProvider';
import { RealtimeProvider } from './store/RealtimeProvider';
import { SessionProvider } from './store/SessionStore';

function App() {
  return (
    <SessionProvider>
      <QueryProvider>
        <RealtimeProvider>
          <AppStateProvider>
            <RouterProvider router={router} />
            <Toaster position="top-center" />
          </AppStateProvider>
        </RealtimeProvider>
      </QueryProvider>
    </SessionProvider>
  );
}

export default App;
