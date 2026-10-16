import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '../app/store/ThemeStore';
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
 * (SessionProvider + TanStack Query + ThemeProvider + MemoryRouter). El componente se monta en una ruta
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
        <ThemeProvider>
          <MemoryRouter initialEntries={[route]}>
            <LocationProbe />
            <Routes>
              <Route path="*" element={ui} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </TestQueryProvider>
    </SessionProvider>,
  );
}

/**
 * Renderiza varias pantallas bajo rutas reales con los mismos providers, para
 * probar navegaciones entre ellas.
 */
export function renderRoutes(
  routes: { path: string; element: React.ReactElement }[],
  { route }: { route: string },
) {
  return render(
    <SessionProvider>
      <TestQueryProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={[route]}>
            <LocationProbe />
            <Routes>
              {routes.map((r) => (
                <Route key={r.path} path={r.path} element={r.element} />
              ))}
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </TestQueryProvider>
    </SessionProvider>,
  );
}
