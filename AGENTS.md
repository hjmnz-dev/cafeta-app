# Cafeta (web, app de estudiante)

## Overview

App web del estudiante de Cafeta, nacida como prototipo exportado de Figma Make. Todas las pantallas funcionan con datos de ejemplo guardados en `localStorage`; cada funcionalidad del scope reemplaza su parte simulada por la API real (`cafeta-api`), sin cambiar la forma de los datos. Este `AGENTS.md` es un resumen ligero; corre `/audit Cafeta` para el escaneo completo cuando empieces a conectar pantallas.

## Stack

- **Language / Runtime**: TypeScript (sin `tsconfig` todavía), React 18, Vite 6
- **UI**: Tailwind 4, componentes shadcn sobre Radix UI (`src/app/components/ui/`), MUI, `lucide-react`, `motion`, `sonner`
- **Routing y formularios**: React Router 7 (`createBrowserRouter`), `react-hook-form`
- **Pruebas**: Vitest + Testing Library en `jsdom` (`*.test.tsx` junto al componente)

## Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm run build
npm test
```

## Key files

| File                             | Owns                                                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `src/app/routes.tsx`             | Todas las rutas de la app                                                                                                    |
| `src/app/store/AppState.tsx`     | Estado simulado de toda la app, persistido en `localStorage` (`cafeta.appstate.v1`); es lo que se va reemplazando por la API |
| `src/app/components/*Screen.tsx` | Una pantalla por archivo                                                                                                     |
| `src/app/components/ui/`         | Componentes base shadcn (Radix + Tailwind)                                                                                   |
| `src/app/lib/`                   | Lógica pura (búsqueda, historias, imágenes) con sus pruebas                                                                  |
| `src/test/utils.tsx`             | Render con los providers reales (`AppStateProvider` + `MemoryRouter`)                                                        |
| `src/styles/theme.css`           | Tokens de color y tema (oscuro por defecto)                                                                                  |

## Conventions

- Exports con nombre en componentes; solo `App.tsx` y `Logo.tsx` usan `export default` hoy.
- Pantallas en `components/`, lógica pura en `lib/`, estado en `store/`: se mantiene esta estructura.
- Al conectar una pantalla a la API, la llamada va por el cliente HTTP común (que traduce el `code` de error), nunca `fetch` suelto dentro del componente.
- Nuevos componentes base se agregan como componentes shadcn en `components/ui/`.

## Gotchas

- En `vite.config.ts`, los plugins de React y Tailwind son obligatorios aunque parezcan sobrar; no los quites.
- Los imports `figma:asset/<archivo>` se resuelven a `src/assets/` con un plugin propio de Vite.
- `localStorage` guarda unos 5 MB en total; por eso las imágenes se reducen antes de guardarse (`lib/image.ts`). Deja de importar cuando la pantalla usa la API.
- Sin `tsconfig` ni typecheck ni lint todavía: `/develop herramientas` los agrega (strict, oxlint, Prettier).
- `package.json` todavía se llama `@figma/my-make-file` y trae un bloque `pnpm` que no aplica: el repo usa npm.
- Hay un archivo suelto `src/app/components/ProfileScreen.tsx.tmp` y `guidelines/Guidelines.md` está vacío.

## Agent skills

- [vercel-react-best-practices](../.claude/skills/vercel-react-best-practices/): `vercel-labs/agent-skills`, patrones y rendimiento en componentes React
- [shadcn](../.claude/skills/shadcn/): `shadcn-ui/ui`, agregar, arreglar y componer componentes shadcn

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
