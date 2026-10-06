import * as Sentry from '@sentry/react';
import { RouterProvider } from 'react-router';
import { ErrorScreen } from './components/ErrorScreen';
import { Toaster } from './components/ui/sonner';
import { router } from './routes';
import { AppStateProvider } from './store/AppState';
import { QueryProvider } from './store/QueryProvider';
import { RealtimeProvider } from './store/RealtimeProvider';
import { SessionProvider } from './store/SessionStore';

// Errores fuera del router (providers): la misma pantalla, con el código del
// evento solo si el monitoreo está activo (spec 0007).
function CrashFallback({ eventId }: { eventId: string }) {
  return (
    <ErrorScreen
      variant="crash"
      eventId={Sentry.getClient() ? eventId : undefined}
    />
  );
}

function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={({ eventId }) => <CrashFallback eventId={eventId} />}
    >
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
    </Sentry.ErrorBoundary>
  );
}

export default App;
