import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import { AppStateProvider } from '../app/store/AppState';

/** Muestra la ruta actual para poder afirmar navegaciones en las pruebas. */
export function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

/**
 * Renderiza un componente dentro de los providers reales de la app
 * (AppStateProvider + MemoryRouter). El componente se monta en una ruta
 * comodín para que siga presente aunque navegue; la ruta actual queda
 * disponible vía <LocationProbe />.
 */
export function renderWithProviders(ui: React.ReactElement, { route = '/' }: { route?: string } = {}) {
  return render(
    <AppStateProvider>
      <MemoryRouter initialEntries={[route]}>
        <LocationProbe />
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>
    </AppStateProvider>,
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
    <AppStateProvider>
      <MemoryRouter initialEntries={[route]}>
        <LocationProbe />
        <Routes>
          {routes.map((r) => (
            <Route key={r.path} path={r.path} element={r.element} />
          ))}
        </Routes>
      </MemoryRouter>
    </AppStateProvider>,
  );
}
