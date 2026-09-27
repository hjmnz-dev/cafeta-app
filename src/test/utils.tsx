import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppStateProvider, useAppState } from '../app/store/AppState';
import { PostCard } from '../app/components/PostCard';
import { SessionProvider } from '../app/store/SessionStore';

/** Un cliente nuevo por prueba y sin reintentos, para no mezclar cachés. */
function TestQueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

/** Muestra la ruta actual para poder afirmar navegaciones en las pruebas. */
export function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

/**
 * Renderiza un componente dentro de los providers reales de la app
 * (SessionProvider + TanStack Query + AppStateProvider + MemoryRouter). El componente se monta en una ruta
 * comodín para que siga presente aunque navegue; la ruta actual queda
 * disponible vía <LocationProbe />.
 */
export function renderWithProviders(
  ui: React.ReactElement,
  { route = '/' }: { route?: string } = {},
) {
  return render(
    <SessionProvider>
      <TestQueryProvider>
        <AppStateProvider>
          <MemoryRouter initialEntries={[route]}>
            <LocationProbe />
            <Routes>
              <Route path="*" element={ui} />
            </Routes>
          </MemoryRouter>
        </AppStateProvider>
      </TestQueryProvider>
    </SessionProvider>,
  );
}

/**
 * Renderiza varias pantallas bajo rutas reales compartiendo un mismo
 * AppStateProvider — útil para probar que un cambio en una pantalla
 * (p. ej. editar perfil) se refleja en otra (ver perfil).
 */
export function renderRoutes(
  routes: { path: string; element: React.ReactElement }[],
  { route }: { route: string },
) {
  return render(
    <SessionProvider>
      <TestQueryProvider>
        <AppStateProvider>
          <MemoryRouter initialEntries={[route]}>
            <LocationProbe />
            <Routes>
              {routes.map((r) => (
                <Route key={r.path} path={r.path} element={r.element} />
              ))}
            </Routes>
          </MemoryRouter>
        </AppStateProvider>
      </TestQueryProvider>
    </SessionProvider>,
  );
}

/**
 * Todas las publicaciones de AppState con <PostCard /> sin `live`: el modo que
 * siguen usando las pantallas que aún no están conectadas a la API.
 */
export function AppStatePosts() {
  const { posts } = useAppState();
  return (
    <>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </>
  );
}
