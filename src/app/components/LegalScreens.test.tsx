import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/utils';
import {
  LEGAL_UPDATED_AT,
  PRIVACY_DOCUMENT,
  TERMS_DOCUMENT,
  TERMS_VERSION,
} from '../lib/legal';
import { router } from '../routes';
import { PrivacyScreen, TermsScreen } from './LegalScreens';

// Textos legales públicos (spec 0009, decisión 12). Sin sesión: el fetch por
// defecto responde 401 a /auth/me y aun así se leen.
describe('TermsScreen', () => {
  it('muestra los términos con su versión y fecha, sin iniciar sesión', () => {
    renderWithProviders(<TermsScreen />, { route: '/terms' });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Términos de uso' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `Última actualización: ${LEGAL_UPDATED_AT} · Versión ${TERMS_VERSION}`,
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(
      TERMS_DOCUMENT.sections.length,
    );
  });

  it('Volver lleva al login cuando no hay historial (pestaña nueva)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TermsScreen />, { route: '/terms' });

    await user.click(screen.getByRole('button', { name: 'Volver' }));

    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });
});

describe('PrivacyScreen', () => {
  it('muestra la política de privacidad con la misma versión que los términos', () => {
    renderWithProviders(<PrivacyScreen />, { route: '/privacy' });

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Política de privacidad',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `Última actualización: ${LEGAL_UPDATED_AT} · Versión ${TERMS_VERSION}`,
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(
      PRIVACY_DOCUMENT.sections.length,
    );
  });
});

describe('rutas de los textos legales', () => {
  it('/terms y /privacy están fuera de las rutas protegidas', () => {
    const root = router.routes[0];
    const publicPaths = (root?.children ?? []).map((route) => route.path);

    expect(publicPaths).toContain('terms');
    expect(publicPaths).toContain('privacy');
  });
});
