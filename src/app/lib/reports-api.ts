/**
 * Llamada para reportar usuarios y publicaciones (spec 0008, decisión 30). Los
 * tipos salen del contrato OpenAPI generado en api-types.ts.
 */
import type { components } from './api-types';
import { apiRequest } from './http';

type Schemas = components['schemas'];
export type CreateReport = Schemas['CreateReportDto'];
export type ReportView = Schemas['ReportViewDto'];
export type ReportReason = CreateReport['reason'];
export type ReportTarget = CreateReport['targetType'];

export const reportsApi = {
  create: (body: CreateReport) =>
    apiRequest<ReportView>('/reports', { method: 'POST', body }),
};
