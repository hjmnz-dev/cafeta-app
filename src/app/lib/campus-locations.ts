import type { CampusLocation } from './posts-api';

/**
 * Ubicaciones del campus que acepta la API al publicar (spec 0005). El tipo
 * sale del OpenAPI: si aquí aparece una que la API no acepta, falla typecheck.
 */
export const CAMPUS_LOCATIONS: readonly CampusLocation[] = [
  'Campus Principal',
  'Biblioteca',
  'Cafetería INTEC',
  'Laboratorio de Computación',
  'Auditorio',
  'Cancha Deportiva',
  'Área de Parqueo',
  'Centro de Estudiantes',
];
