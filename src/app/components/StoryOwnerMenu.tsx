import { useEffect, useState } from 'react';
import { EyeOff, MoreHorizontal, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { userMessageOf } from '../lib/http';
import { countChars } from '../lib/posts';
import { STORY_TEXT_MAX } from '../lib/stories';
import type { StoryView } from '../lib/stories-api';
import { useDeactivateStory, useEditStory } from '../store/stories-queries';

/**
 * HU14 y HU15 · Acciones del autor sobre su historia vigente (decisión 23).
 *
 * Solo se dibuja en la historia propia (lo decide el visor). Editar cambia solo
 * el texto: la imagen o el video no se tocan y la vigencia original se conserva.
 * Desactivar pide confirmación porque no hay forma de reactivar. Mientras hay un
 * menú o un diálogo abierto avisa al visor con `onBusyChange` para que detenga
 * la reproducción automática y no se cierre a medio escribir.
 */

type Panel = 'menu' | 'edit' | 'deactivate' | null;

const ITEM =
  'w-full px-4 py-3 flex items-center gap-3 text-[14px] text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors';

export function StoryOwnerMenu({
  story,
  onBusyChange,
  onDeactivated,
}: {
  story: StoryView;
  onBusyChange: (busy: boolean) => void;
  onDeactivated: () => void;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const [draft, setDraft] = useState('');
  const editStory = useEditStory();
  const deactivateStory = useDeactivateStory();

  useEffect(() => {
    onBusyChange(panel !== null);
  }, [panel, onBusyChange]);

  const used = countChars(draft);
  const tooLong = used > STORY_TEXT_MAX;
  const unchanged = draft.trim() === (story.text ?? '');

  const openEdit = () => {
    setDraft(story.text ?? '');
    setPanel('edit');
  };

  const save = () =>
    editStory.mutate(
      { id: story.id, text: draft.trim() },
      {
        onSuccess: () => {
          toast.success('Historia actualizada');
          setPanel(null);
        },
        onError: (error) => toast.error(userMessageOf(error)),
      },
    );

  const deactivate = () =>
    deactivateStory.mutate(story.id, {
      onSuccess: () => {
        toast.success('Historia desactivada');
        setPanel(null);
        onDeactivated();
      },
      onError: (error) => {
        toast.error(userMessageOf(error));
        setPanel(null);
      },
    });

  return (
    <div className="relative">
      <button
        onClick={() => setPanel(panel === 'menu' ? null : 'menu')}
        aria-label="Opciones de la historia"
        aria-haspopup="menu"
        aria-expanded={panel === 'menu'}
        className="w-9 h-9 rounded-full flex items-center justify-center text-white/85 hover:bg-[var(--surface)]/15 transition-colors"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {panel === 'menu' && (
        <>
          <button
            aria-label="Cerrar menú"
            onClick={() => setPanel(null)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 w-48 z-20 bg-[var(--surface)] rounded-2xl shadow-[var(--shadow-pop)] overflow-hidden"
          >
            <button role="menuitem" onClick={openEdit} className={ITEM}>
              <Pencil className="w-4 h-4 text-[var(--muted)]" />
              Editar texto
            </button>
            <button
              role="menuitem"
              onClick={() => setPanel('deactivate')}
              className={ITEM + ' border-t border-[var(--line-soft)]'}
            >
              <EyeOff className="w-4 h-4 text-[var(--muted)]" />
              Desactivar
            </button>
          </div>
        </>
      )}

      {panel === 'edit' && (
        <Dialog title="Editar texto" onClose={() => setPanel(null)}>
          <textarea
            aria-label="Texto de la historia"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Agrega un texto (opcional)"
            autoFocus
            className="w-full min-h-[96px] resize-none text-[16px] text-[var(--ink)] placeholder:text-[var(--muted)] outline-none bg-[var(--surface-2)] rounded-2xl p-3"
          />
          <p
            className={
              'text-right text-[12px] mt-1 mb-4 ' +
              (tooLong ? 'text-[var(--brand)]' : 'text-[var(--muted)]')
            }
          >
            {used}/{STORY_TEXT_MAX}
          </p>
          <Actions
            confirmLabel="Guardar"
            onCancel={() => setPanel(null)}
            onConfirm={save}
            disabled={tooLong || unchanged || editStory.isPending}
          />
        </Dialog>
      )}

      {panel === 'deactivate' && (
        <Dialog title="Desactivar historia" onClose={() => setPanel(null)}>
          <p className="text-[14px] text-[var(--muted)] leading-relaxed mb-5">
            Dejará de verse de inmediato para quienes te siguen. No se borra,
            pero no se puede reactivar.
          </p>
          <Actions
            confirmLabel="Desactivar"
            onCancel={() => setPanel(null)}
            onConfirm={deactivate}
            disabled={deactivateStory.isPending}
          />
        </Dialog>
      )}
    </div>
  );
}

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-[var(--surface)] w-full max-w-[330px] p-5 rounded-3xl shadow-[var(--shadow-pop)]">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-[17px] font-semibold text-[var(--ink)] font-['Space_Grotesk',sans-serif]">
            {title}
          </h2>
          <button onClick={onClose} aria-label="Cerrar">
            <X className="w-5 h-5 text-[var(--muted)]" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Actions({
  confirmLabel,
  onCancel,
  onConfirm,
  disabled,
}: {
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onCancel}
        className="flex-1 py-2.5 rounded-full text-[14px] font-semibold text-[var(--muted)] bg-[var(--surface-3)] transition-colors"
      >
        Cancelar
      </button>
      <button
        onClick={onConfirm}
        disabled={disabled}
        className="flex-1 py-2.5 rounded-full text-[14px] font-semibold text-[var(--on-brand)] bg-[var(--brand)] hover:bg-[var(--brand-strong)] transition-colors disabled:opacity-40"
      >
        {confirmLabel}
      </button>
    </div>
  );
}
