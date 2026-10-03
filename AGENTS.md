# Cafeta (web, app de estudiante)

## Overview

App web del estudiante de Cafeta, nacida como prototipo exportado de Figma Make. Todas las pantallas funcionan con datos de ejemplo guardados en `localStorage`; cada funcionalidad del scope reemplaza su parte simulada por la API real (`cafeta-api`), sin cambiar la forma de los datos. Este `AGENTS.md` es un resumen ligero; corre `/audit Cafeta` para el escaneo completo cuando empieces a conectar pantallas.

## Stack

- **Language / Runtime**: TypeScript strict (`tsconfig.json`), React 18, Vite 6
- **UI**: Tailwind 4, componentes shadcn sobre Radix UI (`src/app/components/ui/`), MUI, `lucide-react`, `motion`, `sonner`
- **Routing y formularios**: React Router 7 (`createBrowserRouter`), `react-hook-form`
- **Datos de la API**: TanStack Query 5 (`@tanstack/react-query`), sin devtools
- **Pruebas**: Vitest + Testing Library en `jsdom` (`*.test.tsx` junto al componente)

## Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm run lint
npm run format       # o format:check para solo revisar
npm run typecheck
npm run build
npm test
npm run api:types    # regenera los tipos desde OpenAPI; necesita la API en el puerto 3000
```

## Key files

| File                                  | Owns                                                                                                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/routes.tsx`                  | Todas las rutas de la app                                                                                                                                                                              |
| `src/app/store/AppState.tsx`          | Estado simulado de toda la app, persistido en `localStorage` (`cafeta.appstate.v1`); es lo que se va reemplazando por la API                                                                           |
| `src/app/components/*Screen.tsx`      | Una pantalla por archivo                                                                                                                                                                               |
| `src/app/components/ui/`              | Componentes base shadcn (Radix + Tailwind)                                                                                                                                                             |
| `src/app/lib/`                        | Lógica pura (búsqueda, historias, imágenes) con sus pruebas                                                                                                                                            |
| `src/test/utils.tsx`                  | Render con los providers reales (`SessionProvider` + `QueryClientProvider` nuevo por prueba + `AppStateProvider` + `MemoryRouter`) y el arnés `AppStatePosts`                                          |
| `src/test/setup.ts`                   | `fetch` simulado por defecto (`/auth/me` responde 401, `/careers` una lista fija, listas de publicaciones vacías y conteo 0) y `matchMedia` simulado; cada prueba lo cambia con `vi.mocked(fetch)`     |
| `src/test/api.ts`                     | `signIn(handler)` (sesión confirmada con respuestas propias), `postView()` y `page()` para simular la API en las pruebas                                                                               |
| `src/app/store/QueryProvider.tsx`     | Cliente de TanStack Query (30 s de caché, sin reintentar 4xx) que se vacía al cerrar sesión                                                                                                            |
| `src/app/lib/query-keys.ts`           | Claves de caché por dominio; las de publicaciones cuelgan de `postKeys.all`                                                                                                                            |
| `src/app/store/posts-queries.ts`      | Hooks de publicaciones (`useFeed`, `useUserPosts`, `useCreatePost`, `useCareers`…)                                                                                                                     |
| `src/app/components/LivePostList.tsx` | Lista real paginada (esqueletos, error con "Reintentar", vacío y scroll infinito con `InfiniteListFooter`), la misma en feed y perfil                                                                  |
| `src/app/lib/http.ts`                 | Cliente HTTP único (`apiRequest`): agrega el Bearer, traduce el `code` con `error-messages.ts` y ante un 401 borra la sesión y emite `cafeta:session-ended`                                            |
| `src/app/lib/api-types.ts`            | Tipos generados desde OpenAPI con `npm run api:types`; se commitea y nunca se edita a mano                                                                                                             |
| `src/app/lib/auth-api.ts`             | Llamadas de auth y carreras, con sus tipos tomados de `api-types.ts`                                                                                                                                   |
| `src/app/store/SessionStore.tsx`      | Sesión real (`useSession()`): token en `localStorage` con "Recordarme", en `sessionStorage` sin él                                                                                                     |
| `src/app/components/RequireAuth.tsx`  | Guardia de las rutas protegidas en `routes.tsx`                                                                                                                                                        |
| `src/styles/theme.css`                | Tokens de color y tema (oscuro por defecto)                                                                                                                                                            |
| `deploy/server.mjs`                   | Servidor estático de producción en App Service (spec 0006): solo `GET`/`HEAD`, nunca sale de `dist/`, `index.html` para las rutas internas, 404 para estáticos que no existen; igual en `Cafeta-Admin` |
| `.github/workflows/ci.yml`            | CI en cada push; job `deploy` solo en `main`: build con `VITE_API_URL` del ambiente `production`, `dist/version.txt` con el commit, subida con OIDC y prueba de humo que espera ese commit             |

## Conventions

- Exports con nombre en componentes; solo `App.tsx` y `Logo.tsx` usan `export default` hoy.
- Pantallas en `components/`, lógica pura en `lib/`, estado en `store/`: se mantiene esta estructura.
- Al conectar una pantalla a la API, la llamada va por el cliente HTTP común (que traduce el `code` de error), nunca `fetch` suelto dentro del componente.
- Nuevos componentes base se agregan como componentes shadcn en `components/ui/`.
- Toda ruta nueva va dentro de `RequireAuth` en `routes.tsx`; las únicas públicas son `/`, `/login`, `/register` y `/forgot-password`.
- Las pantallas muestran el `userMessage` de `ApiError`, nunca el `message` de la API; un `code` nuevo se suma al mapa de `lib/error-messages.ts`.
- Los datos de la API se leen con hooks de TanStack Query en `store/<dominio>-queries.ts`, con claves de `lib/query-keys.ts` y llamadas de `lib/<dominio>-api.ts`; al escribir se invalida la clave raíz del dominio. Nunca se guardan en `AppState` ni en `localStorage`.
- Una publicación de la API se dibuja con `<PostCard live={…} />` (convierte con `toCardPost` de `lib/posts.ts`); sin `live`, la tarjeta sigue en modo `AppState` para las pantallas aún no conectadas.
- Los avisos usan `toast` de `sonner`; el `Toaster` está montado una vez en `App.tsx`.

## Gotchas

- En `vite.config.ts`, los plugins de React y Tailwind son obligatorios aunque parezcan sobrar; no los quites.
- Los imports `figma:asset/<archivo>` se resuelven a `src/assets/` con un plugin propio de Vite.
- `localStorage` guarda unos 5 MB en total; por eso las imágenes se reducen antes de guardarse (`lib/image.ts`). Deja de importar cuando la pantalla usa la API.
- La URL de la API sale de `VITE_API_URL` (ver `.env.example`); sin ella usa `http://localhost:3000/api/v1`.
- `package.json` todavía se llama `@figma/my-make-file` y trae un bloque `pnpm` que no aplica: el repo usa npm.
- Hay un archivo suelto `src/app/components/ProfileScreen.tsx.tmp` y `guidelines/Guidelines.md` está vacío.
- El scroll infinito observa el contenedor con scroll de cada pantalla (el marco del teléfono), no la ventana. jsdom no trae `IntersectionObserver`: las pruebas lo simulan (ver `InfiniteListFooter.test.tsx`).
- TanStack Query pausa los reintentos mientras la pestaña está oculta; en una verificación en navegador, el panel tiene que estar visible para ver los estados de error.
- `deploy/server.mjs` es el mismo archivo que en `Cafeta-Admin`: un cambio va en los dos. Si un build nuevo emite una extensión que no está en su tabla de tipos, súmala ahí.
- Producción: https://cafeta-web-hj01.azurewebsites.net (`/version.txt` muestra el commit publicado). Un cambio que toca el contrato se despliega después del de la API.

## Agent skills

- [vercel-react-best-practices](../.claude/skills/vercel-react-best-practices/): `vercel-labs/agent-skills`, patrones y rendimiento en componentes React
- [shadcn](../.claude/skills/shadcn/): `shadcn-ui/ui`, agregar, arreglar y componer componentes shadcn
- [tanstack-query](../.claude/skills/tanstack-query/): `tanstack-skills/tanstack-skills`, consultas, mutaciones y listas infinitas con TanStack Query
- [tanstack-query-best-practices](../.claude/skills/tanstack-query-best-practices/): `deckardger/tanstack-agent-skills`, caché, claves e invalidación con TanStack Query

Declined: skill de `openapi-typescript`

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
