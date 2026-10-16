import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

/** Apariencia de la app. El oscuro es el predeterminado del producto. */
export type Theme = 'dark' | 'light';

const THEME_KEY = 'cafeta.theme';
/**
 * Donde el prototipo guardaba toda su demo (perfil, directorio, publicaciones,
 * mensajes). Ya no se usa: se lee una vez para conservar el tema elegido y se
 * borra del navegador.
 */
const LEGACY_KEY = 'cafeta.appstate.v1';

const isTheme = (value: unknown): value is Theme =>
  value === 'dark' || value === 'light';

/** El tema de la demo vieja, que además se borra del navegador siempre. */
function takeLegacyTheme(): Theme | null {
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy === null) return null;
  localStorage.removeItem(LEGACY_KEY);
  try {
    const theme: unknown = JSON.parse(legacy)?.settings?.theme;
    return isTheme(theme) ? theme : null;
  } catch {
    return null;
  }
}

/** El tema guardado; si no hay, el de la demo vieja; si no, oscuro. */
function loadTheme(): Theme {
  try {
    const legacy = takeLegacyTheme();
    const saved = localStorage.getItem(THEME_KEY);
    if (isTheme(saved)) return saved;
    if (legacy) return legacy;
  } catch {
    /* almacenamiento no disponible: el predeterminado */
  }
  return 'dark';
}

interface ThemeValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

/**
 * La única preferencia que vive solo en este navegador: claro u oscuro. El
 * tema va en <html> para que los tokens de color (styles/theme.css) apliquen
 * a todo el árbol, incluidos los portales y el fondo del documento.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(loadTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* sin almacenamiento: el tema dura lo que dure la pestaña */
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme necesita <ThemeProvider>');
  return value;
}
