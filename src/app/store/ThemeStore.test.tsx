import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeStore';

function Probe() {
  const { theme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme}
    </button>
  );
}

const LEGACY = 'cafeta.appstate.v1';

describe('ThemeStore — el tema sin la demo vieja', () => {
  beforeEach(() => localStorage.clear());

  it('oscuro por defecto, y elegir otro lo guarda y lo pone en <html>', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByRole('button')).toHaveTextContent('dark');
    await user.click(screen.getByRole('button'));
    expect(localStorage.getItem('cafeta.theme')).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('conserva el tema de la demo vieja y la borra del navegador', () => {
    localStorage.setItem(
      LEGACY,
      JSON.stringify({ settings: { theme: 'light' }, posts: [{ id: 'p1' }] }),
    );
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByRole('button')).toHaveTextContent('light');
    expect(localStorage.getItem(LEGACY)).toBeNull();
  });

  it('con un tema ya guardado, igual borra la demo vieja', () => {
    localStorage.setItem('cafeta.theme', 'dark');
    localStorage.setItem(LEGACY, 'no es json');
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByRole('button')).toHaveTextContent('dark');
    expect(localStorage.getItem(LEGACY)).toBeNull();
  });
});
