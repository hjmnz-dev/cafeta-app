/**
 * Subida de archivos (spec 0008, decisión 13). Devuelve la clave, que se manda
 * al publicar, y un enlace de lectura para la vista previa.
 */
import type { components } from './api-types';
import { apiRequest } from './http';

export type UploadView = components['schemas']['UploadViewDto'];

export const uploadsApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiRequest<UploadView>('/uploads', { method: 'POST', body: form });
  },
};
