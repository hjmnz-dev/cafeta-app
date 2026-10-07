import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import { AppLayout } from './AppLayout';

// La navegación inferior solo va en las pantallas de la app con sesión; los
// textos legales son públicos y van a pantalla completa (spec 0009, decisión 12).
describe('AppLayout: navegación inferior', () => {
  it.each(['/terms', '/privacy', '/login'])(
    '%s no muestra la navegación inferior',
    (route) => {
      renderWithProviders(<AppLayout />, { route });

      expect(screen.queryByText('Discover')).not.toBeInTheDocument();
    },
  );

  it('una pantalla de la app sí la muestra', () => {
    renderWithProviders(<AppLayout />, { route: '/home' });

    expect(screen.getByText('Discover')).toBeInTheDocument();
  });
});
