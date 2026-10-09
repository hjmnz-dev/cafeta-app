import { toast } from 'sonner';
import { ApiError, userMessageOf } from '../lib/http';
import type { ReportTarget } from '../lib/reports-api';
import {
  REPORT_ALREADY_PENDING,
  useCreateReport,
} from '../store/reports-queries';
import { ReportDialog } from './ReportDialog';

/**
 * Reporta de verdad a un usuario o una publicación (HU55 y HU56). Cierra con un
 * aviso al enviar; si ya había un reporte pendiente lo dice y cierra, y
 * cualquier otro error se muestra dentro del diálogo para poder reintentar.
 */
export function ReportTargetDialog({
  targetType,
  targetId,
  title,
  subject,
  onClose,
}: {
  targetType: ReportTarget;
  targetId: string;
  title: string;
  subject: string;
  onClose: () => void;
}) {
  const create = useCreateReport();

  return (
    <ReportDialog
      title={title}
      subject={subject}
      pending={create.isPending}
      error={create.isError ? userMessageOf(create.error) : null}
      onClose={onClose}
      onConfirm={({ reason, details }) =>
        create.mutate(
          { targetType, targetId, reason, details },
          {
            onSuccess: () => {
              toast.success('Gracias, un administrador revisará tu reporte.');
              onClose();
            },
            onError: (error) => {
              if (
                error instanceof ApiError &&
                error.code === REPORT_ALREADY_PENDING
              ) {
                toast.info(error.userMessage);
                onClose();
              }
            },
          },
        )
      }
    />
  );
}
