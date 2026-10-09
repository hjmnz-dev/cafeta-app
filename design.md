# Sistema de diseño de Cafeta

Este documento describe el lenguaje visual que ya vive en la app web (`Cafeta`) y que la consola admin (`Cafeta-Admin`) copia. No es un rediseño: es el mapa de lo que existe, con las reglas de accesibilidad que se cumplen. La fuente de verdad en código es `src/styles/theme.css`; si algo de aquí no coincide con ese archivo, manda el archivo y este documento se corrige.

Spec: [0008, decisión 5](../docs/specs/0008-decisiones-aceleradas/index.md#5-sistema-de-diseño-y-accesibilidad).

## Idea de marca

Cafeta es una red social cerrada para la comunidad de INTEC. El símbolo son dos arcos abiertos y un punto: comunidad cerrada, no encerrada. El color es un rojo café sobre superficies cálidas, nunca un gris azulado. El tema oscuro es el predeterminado; el claro es una opción en Ajustes.

## Tipografía

| Uso                       | Fuente                  | Dónde                                         |
| ------------------------- | ----------------------- | --------------------------------------------- |
| Marca y títulos grandes   | Space Grotesk 400 a 700 | `--font-brand`, logo, encabezados de pantalla |
| Interfaz y texto corrido  | DM Sans                 | `--font-ui`, todo el cuerpo                   |
| Datos, etiquetas técnicas | IBM Plex Mono 400 y 500 | `--font-mono`, encabezados de tabla y códigos |

- Base de 16 px (`--font-size`). Títulos `h1` a `h4` y `label`, `button` e `input` heredan tamaño y peso de `theme.css`; una clase de Tailwind (`text-[14px]`) los sobrescribe.
- Tamaños que se usan en las pantallas: 11 y 12 px para metadatos, 13 y 14 px para etiquetas y botones, 15 px para texto de lectura, 18 y 24 px para títulos.
- Peso `500` para énfasis (`--font-weight-medium`), `600` para botones y etiquetas, `400` para texto corrido.
- Las fuentes se cargan desde Google Fonts en `src/styles/fonts.css`.

## Color

Los colores se usan por **función**, no por tono: "superficie" y "tinta" significan lo mismo en claro y en oscuro. Las pantallas usan estos tokens (`var(--ink)`), no hex sueltos.

| Token         | Claro     | Oscuro    | Para qué                                       |
| ------------- | --------- | --------- | ---------------------------------------------- |
| `--app-bg`    | `#efebe8` | `#14100f` | Fondo de pantalla                              |
| `--surface`   | `#ffffff` | `#1d1817` | Tarjetas y barras                              |
| `--surface-2` | `#fbf8f7` | `#241e1d` | Pozo dentro de una tarjeta                     |
| `--surface-3` | `#f1ece9` | `#2b2422` | Campos y superficies apagadas                  |
| `--line`      | `#e3ddd9` | `#362e2c` | Bordes                                         |
| `--ink`       | `#171313` | `#f5f0ee` | Texto principal                                |
| `--ink-2`     | `#4a4340` | `#cdc3bf` | Texto secundario                               |
| `--muted`     | `#6b625e` | `#9c918c` | Texto tenue e iconos inactivos                 |
| `--tint`      | `#ffe9e6` | `#3a1d1c` | Superficie de acento                           |
| `--brand`     | `#c42222` | `#ff5a52` | Rojo Cafeta para texto, enlaces y controles    |
| `--on-brand`  | `#ffffff` | `#1a0f0e` | Texto sobre el rojo                            |
| `--ok`        | `#34c759` | `#4ade80` | Estados correctos (solo indicadores, no texto) |

Además existen los tokens de shadcn (`--primary`, `--card`, `--accent`, `--destructive`, `--ring`…) para los componentes de `components/ui/`, y el rojo del logo `--brand-red` (`#d62828`), que se reserva para la marca y los botones llenos con texto blanco.

### Contraste

El mínimo es **WCAG 2.1 AA: 4,5:1** para texto. `src/app/lib/contrast.test.ts` lee `theme.css` y comprueba cada par texto sobre fondo que usa la app, en claro y en oscuro; si un token baja del mínimo, la prueba falla. Para el texto tenue en claro se usa `#6b625e` (no el gris `#8a807c` de antes, que daba 3,2:1 sobre el fondo de pantalla) y para el rojo de texto `#c42222`.

### Etiquetas del perfil (DEF-10)

Cada etiqueta del perfil pertenece a una categoría y tiene su color. El color **no es el único dato**: la categoría también va como título flotante y como texto para lectores de pantalla, y en Mi perfil hay una leyenda.

| Categoría (API) | Nombre    | Significa                                       | Color                                                |
| --------------- | --------- | ----------------------------------------------- | ---------------------------------------------------- |
| `CAREER`        | Carrera   | La carrera o el programa que estudia la persona | Rosa de marca con tinta roja (`--tag-carrera-*`)     |
| `SKILL`         | Habilidad | Algo que la persona sabe hacer                  | Neutro cálido con tinta oscura (`--tag-habilidad-*`) |
| `INTEREST`      | Interés   | Un tema que le gusta o quiere aprender          | Neutro claro con tinta tenue (`--tag-interes-*`)     |

El mapa vive en `TAG_CATEGORIES` (`store/AppState.tsx`) y la conversión desde la API en `tagCategoryOf` (`lib/profiles.ts`).

## Espaciado, forma y elevación

- Escala de Tailwind (4 px). Márgenes de pantalla de 16 px (`p-4`), separación entre elementos de 8, 12 y 16 px.
- Radios: `--radius` es `0.625rem`; los campos usan 12 a 16 px, las tarjetas 16 a 24 px y los avatares y botones redondos `rounded-full`.
- Sombras: `--shadow-card` para tarjetas y `--shadow-pop` para menús y diálogos.
- La web es **móvil primero**: la app vive en un marco de 390 px de ancho (se ve como teléfono en escritorio). La consola admin usa un lienzo ancho.
- Anillo de historia: `--story-ring`, un degradado del rojo de marca.

## Componentes

- **Base (shadcn sobre Radix)**: `src/app/components/ui/`. Botón, campo, diálogo, hoja, menú, pestañas, interruptor, etc. Un componente base nuevo se agrega aquí.
- **Propios**: `Checkbox` (casilla real con `<input>` oculto y la etiqueta alrededor), `ProfileAvatar`, `StoryAvatar`, `PostCard` y sus pantallas, `InfiniteListFooter`, `ReportDialog`.
- **Íconos**: `lucide-react`. Un ícono decorativo lleva `aria-hidden`; un botón de solo ícono lleva `aria-label`.
- **Avisos**: `toast` de `sonner`, montado una vez en `App.tsx`.
- **Estados**: toda lista tiene esqueleto de carga, estado vacío con texto y error con "Reintentar".

## Accesibilidad

Reglas que se cumplen y que una pantalla nueva debe cumplir también:

1. **Foco visible con teclado.** Un solo contorno de 2 px en `--brand` para todo control (`a`, `button`, `input`, `select`, `textarea`, `[role=button]`, `[tabindex]`), definido al final de `theme.css` fuera de las capas para ganarle a `outline-none`. El ratón no lo dispara (`:focus-visible`).
2. **Contraste AA** en todos los textos (ver arriba).
3. **Etiqueta en cada campo.** Un `<label htmlFor>` con el `id` del campo, o un `aria-label` cuando no hay texto visible (por ejemplo, el buscador).
4. **Nombre en cada botón de solo ícono**, con `aria-label`.
5. **El color no es el único dato.** Categorías de etiquetas, errores y estados llevan también texto o ícono.
6. **Movimiento reducido.** Con `prefers-reduced-motion` se apagan animaciones y transiciones.
7. **Controles reales.** Casillas, botones y enlaces son elementos nativos o de Radix, no `div` con `onClick`.

Cómo se revisa: `npx oxlint --jsx-a11y-plugin src` (hallazgos de accesibilidad), `npm test` (incluye el contraste) y recorrer la pantalla con la tecla Tab.

## La consola admin

`Cafeta-Admin` **copia** estos tokens (no hay paquete compartido). Su `src/styles/index.css` trae la marca (`--brand-*`) y la misma regla de foco y de movimiento reducido; sus pantallas usan los mismos colores y fuentes en un lienzo de escritorio, siempre en tema claro. Al cambiar un token aquí, se cambia también en el otro repo (`--brand-muted` y `--brand-red-text` son los que más cuentan por el contraste).
