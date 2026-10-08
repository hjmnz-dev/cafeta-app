import { X } from 'lucide-react';
import type { StoryView } from '../lib/stories-api';
import { CommentsPanel } from './CommentsPanel';

/**
 * HU17 a HU19 · Comentarios de una historia (spec 0009, decisión 24).
 *
 * Una hoja que sube desde abajo sobre el visor con el mismo panel de las
 * publicaciones. El visor se pausa mientras está abierta, así que nada avanza
 * solo mientras se escribe. Se monta solo al abrirla.
 */
export function StoryCommentsSheet({
  story,
  onClose,
}: {
  story: StoryView;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="Comentarios de la historia"
      className="absolute inset-x-0 bottom-0 z-30 max-h-[70%] overflow-y-auto rounded-t-3xl bg-[var(--surface)] px-4 pt-3 pb-6 shadow-[var(--shadow-pop)]"
    >
      <div className="flex justify-end">
        <button
          onClick={onClose}
          aria-label="Cerrar comentarios"
          className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)] hover:bg-[var(--surface-2)]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <CommentsPanel
        target={{ kind: 'stories', id: story.id }}
        count={story.commentCount}
      />
    </div>
  );
}
