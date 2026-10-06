import { describe, it, expect } from 'vitest';
import {
  firstNameOf,
  isApiUserId,
  restrictedNotice,
  tagCategoryOf,
} from './profiles';

describe('isApiUserId', () => {
  it('reconoce los UUID de la API y deja fuera los ids de la demo', () => {
    expect(isApiUserId('01926f00-0000-7000-8000-0000000000bb')).toBe(true);
    expect(isApiUserId('maria')).toBe(false);
    expect(isApiUserId('')).toBe(false);
  });
});

describe('tagCategoryOf', () => {
  it('lleva cada categoría de la API a la paleta de etiquetas', () => {
    expect(tagCategoryOf('CAREER')).toBe('carrera');
    expect(tagCategoryOf('SKILL')).toBe('habilidad');
    expect(tagCategoryOf('INTEREST')).toBe('interes');
  });
});

describe('firstNameOf', () => {
  it('toma la primera palabra del nombre', () => {
    expect(firstNameOf('  María Rodríguez ')).toBe('María');
  });
});

describe('restrictedNotice', () => {
  const base = { displayName: 'María Rodríguez' };

  it('no hay aviso si se puede ver el contenido', () => {
    expect(
      restrictedNotice({ ...base, canSeeContent: true, visibility: 'PUBLIC' }),
    ).toBeNull();
  });

  it('distingue "Solo seguidores" de "Privado"', () => {
    expect(
      restrictedNotice({
        ...base,
        canSeeContent: false,
        visibility: 'FOLLOWERS',
      })?.title,
    ).toBe('Esta cuenta es solo para seguidores');
    expect(
      restrictedNotice({ ...base, canSeeContent: false, visibility: 'PRIVATE' })
        ?.body,
    ).toBe('Solo María ve sus publicaciones e historias.');
  });
});
