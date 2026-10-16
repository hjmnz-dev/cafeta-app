/**
 * Lógica pura del perfil de la API (decisión 15): qué se muestra según lo que
 * la API dejó ver. Sin red ni estado.
 */
import type { ProfileView, ProfileVisibility } from './profiles-api';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Los perfiles de la API tienen id UUID; cualquier otra cosa no existe. */
export function isApiUserId(userId: string): boolean {
  return UUID.test(userId);
}

/** Categoría de una etiqueta del perfil en la paleta de la app. */
export type TagCategory = 'carrera' | 'habilidad' | 'interes';

/** Semántica de color de las etiquetas del perfil (resuelve DEF-10). */
export const TAG_CATEGORIES: Record<
  TagCategory,
  { label: string; bg: string; text: string; border: string }
> = {
  // Tokens del tema (ver styles/theme.css): la distinción entre categorías
  // debe leerse igual en claro y en oscuro, así que se fija el papel de cada
  // una, no un color concreto.
  carrera: {
    label: 'Carrera',
    bg: 'var(--tag-carrera-bg)',
    text: 'var(--tag-carrera-ink)',
    border: 'var(--tag-carrera-line)',
  },
  habilidad: {
    label: 'Habilidad',
    bg: 'var(--tag-habilidad-bg)',
    text: 'var(--tag-habilidad-ink)',
    border: 'var(--tag-habilidad-line)',
  },
  interes: {
    label: 'Interés',
    bg: 'var(--tag-interes-bg)',
    text: 'var(--tag-interes-ink)',
    border: 'var(--tag-interes-line)',
  },
};

const TAG_CATEGORY: Readonly<
  Record<ProfileView['tags'][number]['category'], TagCategory>
> = {
  CAREER: 'carrera',
  SKILL: 'habilidad',
  INTEREST: 'interes',
};

/** Orden en que se ofrecen las categorías al editar etiquetas. */
export const API_TAG_CATEGORIES: readonly ProfileView['tags'][number]['category'][] =
  ['CAREER', 'SKILL', 'INTEREST'];

/** Máximo de etiquetas por perfil (lo valida la API). */
export const PROFILE_TAGS_MAX = 12;
export const BIO_MAX = 160;

/** La categoría de la API en la paleta de etiquetas de la app. */
export function tagCategoryOf(
  category: ProfileView['tags'][number]['category'],
): TagCategory {
  return TAG_CATEGORY[category];
}

export function firstNameOf(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? displayName;
}

/** Texto del aviso del perfil limitado; null si no hay que mostrarlo. */
export function restrictedNotice(
  profile: Pick<ProfileView, 'canSeeContent' | 'visibility' | 'displayName'>,
): { title: string; body: string } | null {
  if (profile.canSeeContent) return null;
  const name = firstNameOf(profile.displayName);
  return profile.visibility === 'PRIVATE'
    ? {
        title: 'Esta cuenta es privada',
        body: `Solo ${name} ve sus publicaciones e historias.`,
      }
    : {
        title: 'Esta cuenta es solo para seguidores',
        body: `Sigue a ${name} para ver sus publicaciones e historias.`,
      };
}

/** Etiqueta corta de cada opción de privacidad. */
export const VISIBILITY_LABEL: Readonly<Record<ProfileVisibility, string>> = {
  PUBLIC: 'Público',
  FOLLOWERS: 'Solo seguidores',
  PRIVATE: 'Privado',
};
