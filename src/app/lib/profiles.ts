/**
 * Lógica pura del perfil de la API (decisión 15): qué se muestra según lo que
 * la API dejó ver. Sin red ni estado.
 */
import type { TagCategory } from '../store/AppState';
import type { ProfileView, ProfileVisibility } from './profiles-api';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Los perfiles de la API tienen id UUID; los de la demo, un nombre corto. */
export function isApiUserId(userId: string): boolean {
  return UUID.test(userId);
}

const TAG_CATEGORY: Readonly<
  Record<ProfileView['tags'][number]['category'], TagCategory>
> = {
  CAREER: 'carrera',
  SKILL: 'habilidad',
  INTEREST: 'interes',
};

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
