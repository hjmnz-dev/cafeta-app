import { describe, it, expect } from 'vitest';
import { normalize, queryTerms, searchUsers, searchPosts } from './search';
import type { DirectoryUser, Post } from '../store/AppState';

const user = (patch: Partial<DirectoryUser>): DirectoryUser => ({
  id: 'u1',
  name: 'María Rodríguez',
  handle: '@mrodriguez',
  career: 'Medicina',
  bio: 'Apuntes y grupos de estudio.',
  avatar: '',
  visibility: 'public',
  followers: 10,
  following: 5,
  posts: 3,
  tags: [{ label: 'Anatomía', category: 'habilidad' }],
  ...patch,
});

const post = (patch: Partial<Post>): Post => ({
  id: 'p1',
  authorId: 'juan',
  authorName: 'Juan Pérez',
  authorAvatar: '',
  career: 'Ing. Industrial',
  time: '2h',
  type: 'text',
  content: 'Resumen de Cálculo Diferencial para el parcial. #apuntes',
  likes: 0,
  comments: 0,
  active: true,
  edited: false,
  ...patch,
});

describe('DEF-07 · lib/search — coincidencia de la búsqueda global', () => {
  it('normaliza tildes y mayúsculas en ambos lados de la comparación', () => {
    expect(normalize('  Gómez  ')).toBe('gomez');
    expect(searchUsers([user({})], 'maria rodriguez')).toHaveLength(1);
  });

  it('ignora los prefijos @ y # al interpretar la consulta', () => {
    expect(queryTerms('  @mrodriguez #Apuntes ')).toEqual([
      'mrodriguez',
      'apuntes',
    ]);
    expect(searchUsers([user({})], '@mrodriguez')).toHaveLength(1);
    expect(searchPosts([post({})], '#apuntes')).toHaveLength(1);
  });

  it('exige que todas las palabras coincidan, no una cualquiera', () => {
    const maria = user({});
    const pedro = user({
      id: 'u2',
      name: 'Pedro Sánchez',
      handle: '@psanchez',
      career: 'Medicina',
      bio: '',
      tags: [],
    });

    expect(searchUsers([maria, pedro], 'medicina')).toHaveLength(2);
    expect(searchUsers([maria, pedro], 'maria medicina')).toEqual([maria]);
  });

  it('busca contenido por palabra clave, autor, carrera y campos del recurso', () => {
    const pdf = post({
      id: 'p2',
      authorId: 'maria',
      authorName: 'María Rodríguez',
      career: 'Medicina',
      type: 'pdf',
      content: 'Libro para quien lo necesite.',
      resourceTitle: 'Anatomia_Basica_Vol1.pdf',
    });

    expect(searchPosts([post({}), pdf], 'calculo').map((p) => p.id)).toEqual([
      'p1',
    ]);
    expect(searchPosts([post({}), pdf], 'juan').map((p) => p.id)).toEqual([
      'p1',
    ]);
    expect(searchPosts([post({}), pdf], 'anatomia').map((p) => p.id)).toEqual([
      'p2',
    ]);
  });

  it('no devuelve publicaciones desactivadas (HU23): la búsqueda no las revive', () => {
    expect(searchPosts([post({ active: false })], 'calculo')).toEqual([]);
  });

  it('con la consulta vacía no devuelve nada: la pantalla decide qué mostrar', () => {
    expect(searchUsers([user({})], '   ')).toEqual([]);
    expect(searchPosts([post({})], '')).toEqual([]);
  });
});
