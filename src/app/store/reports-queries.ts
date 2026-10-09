/**
 * Hooks de reportes (spec 0008, decisión 30). La red queda en reports-api.ts.
 * Lo ya reportado en esta sesión vive en la caché de TanStack Query, no en
 * AppState ni en localStorage: al cerrar sesión se vacía junto con todo lo demás.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { ApiError } from '../lib/http';
import { reportKeys } from '../lib/query-keys';
import {
  reportsApi,
  type CreateReport,
  type ReportTarget,
} from '../lib/reports-api';

export const REPORT_ALREADY_PENDING = 'REPORT_ALREADY_PENDING';

function markReported(
  queryClient: QueryClient,
  targetType: ReportTarget,
  targetId: string,
) {
  queryClient.setQueryData(reportKeys.sent(targetType, targetId), true);
}

/** ¿Ya se reportó este objetivo en esta sesión? Evita ofrecer repetirlo. */
export function useHasReported(
  targetType: ReportTarget,
  targetId: string,
): boolean {
  const { data } = useQuery({
    queryKey: reportKeys.sent(targetType, targetId),
    queryFn: () => false,
    enabled: false,
    initialData: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return data;
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateReport) => reportsApi.create(body),
    onSuccess: (_view, body) =>
      markReported(queryClient, body.targetType, body.targetId),
    // Un duplicado también significa "ya está reportado": el botón se apaga.
    onError: (error, body) => {
      if (error instanceof ApiError && error.code === REPORT_ALREADY_PENDING) {
        markReported(queryClient, body.targetType, body.targetId);
      }
    },
  });
}
