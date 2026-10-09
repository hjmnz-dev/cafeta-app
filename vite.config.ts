import { defineConfig } from 'vitest/config';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// Source maps a Sentry (spec 0007): solo en el job deploy, que trae el token.
// Los mapas se borran después de subirlos, y una subida fallida rompe el build.
function sentrySourceMaps() {
  const authToken = process.env.SENTRY_AUTH_TOKEN;
  if (!authToken) return [];
  return [
    sentryVitePlugin({
      authToken,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      release: { name: process.env.VITE_APP_VERSION },
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
      telemetry: false,
      errorHandler: (error) => {
        throw error;
      },
    }),
  ];
}

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '');
        return path.resolve(__dirname, 'src/assets', filename);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    ...sentrySourceMaps(),
  ],
  // Mapas sin enlazar desde el bundle: nunca se publican (spec 0007).
  build: { sourcemap: 'hidden' },
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: { include: [/theme\.css/] },
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
