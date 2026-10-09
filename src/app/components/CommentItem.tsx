import { useState } from 'react';
import { Link } from 'react-router';
import { EyeOff, MoreHorizontal, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { COMMENT_MAX, type CommentView } from '../lib/comments-api';
import { userMessageOf } from '../lib/http';
import { countChars, relativeTime } from '../lib/posts';
import {
  useDeactivateComment,
  useEditComment,
} from '../store/comments-queries';

/**
 * HU21 a HU24 · Un comentario de una publicación (decisión 21).
 *
 * Los ajenos solo se leen. Los propios traen un menú con Editar (en el mismo
 * lugar, con contador de 500) y Desactivar (pide confirmar, porque no se puede
 * deshacer). El autor de la publicación no puede quitar comentarios ajenos.
 */

type Mode = 'view' | 'menu' | 'edit' | 'confirm';

const ITEM =
  'w-full px-4 py-2.5 flex items-center gap-3 text-[13px] text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors';

export function CommentItem({
  postId,
  comment,
  now,
}: {
  postId: string;
  comment: CommentView;
  now: Date;
}) {
  const [mode, setMode] = useState<Mode>('view');
  const [draft, setDraft] = useState(comment.content);
  const editComment = useEditComment();
  const deactivateComment = useDeactivateComment();

  const used = countChars(draft);
  const tooLong = used > COMMENT_MAX;
  const unchanged = draft.trim() === comment.content;
  const profileHref = comment.isMine ? '/profile' : `/u/${comment.author.id}`;

  const save = () =>
    editComment.mutate(
      { postId, commentId: comment.id, content: draft.trim() },
      {
        onSuccess: () => {
          toast.success('Comentario actualizado');
          setMode('view');
        },
        onError: (error) => toast.error(userMessageOf(error)),
      },
    );

  const deactivate = () =>
    deactivateComment.mutate(
      { postId, commentId: comment.id },
      {
        onSuccess: () => toast.success('Comentario desactivado'),
        onError: (error) => {
          toast.error(userMessageOf(error));
          setMode('view');
        },
      },
    );

  return (
    <li
      className="relative flex gap-2.5 py-2.5"
      data-testid={`comment-${comment.id}`}
    >
      <Link to={profileHref} className="flex-none" aria-hidden tabIndex={-1}>
        {comment.author.avatarUrl ? (
          <img
            src={comment.author.avatarUrl}
            alt=""
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <span className="w-8 h-8 rounded-full bg-[var(--brand)] text-[var(--on-brand)] flex items-center justify-center text-[13px] font-semibold">
            {comment.author.displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-[var(--muted)] truncate">
          <Link to={profileHref} className="font-semibold text-[var(--ink)]">
            {comment.author.displayName}
          </Link>
          {' · '}
          {relativeTime(comment.createdAt, now)}
          {comment.editedAt && ' · Editado'}
        </p>

        {mode === 'edit' ? (
          <div className="mt-1">
            <textarea
              aria-label="Editar comentario"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              className="w-full min-h-[64px] resize-none text-[14px] text-[var(--ink)] bg-[var(--surface-2)] rounded-xl p-2.5 outline-none"
            />
            <div className="flex items-center justify-between mt-1">
              <span
                className={
                  'text-[12px] ' +
                  (tooLong ? 'text-[var(--brand)]' : 'text-[var(--muted)]')
                }
              >
                {used}/{COMMENT_MAX}
              </span>
              <span className="flex gap-2">
                <button
                  onClick={() => setMode('view')}
                  className="px-3 py-1.5 rounded-full text-[13px] font-semibold text-[var(--muted)] bg-[var(--surface-3)]"
                >
                  Cancelar
                </button>
                <button
                  onClick={save}
                  disabled={
                    tooLong ||
                    unchanged ||
                    draft.trim() === '' ||
                    editComment.isPending
                  }
                  className="px-3 py-1.5 rounded-full text-[13px] font-semibold text-[var(--on-brand)] bg-[var(--brand)] disabled:opacity-40"
                >
                  Guardar
                </button>
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[14px] text-[var(--ink)] whitespace-pre-wrap break-words">
            {comment.content}
          </p>
        )}
      </div>

      {comment.isMine && mode !== 'edit' && (
        <div className="relative flex-none">
          <button
            onClick={() => setMode(mode === 'menu' ? 'view' : 'menu')}
            aria-label="Opciones del comentario"
            aria-haspopup="menu"
            aria-expanded={mode === 'menu'}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)] hover:bg-[var(--surface-2)]"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {mode === 'menu' && (
            <>
              <button
                aria-label="Cerrar menú"
                onClick={() => setMode('view')}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div
                role="menu"
                className="absolute right-0 top-full z-20 w-40 bg-[var(--surface)] rounded-2xl shadow-[var(--shadow-pop)] border border-[var(--line)] overflow-hidden"
              >
                <button
                  role="menuitem"
                  className={ITEM}
                  onClick={() => {
                    setDraft(comment.content);
                    setMode('edit');
                  }}
                >
                  <Pencil className="w-4 h-4 text-[var(--muted)]" />
                  Editar
                </button>
                <button
                  role="menuitem"
                  className={ITEM + ' border-t border-[var(--line-soft)]'}
                  onClick={() => setMode('confirm')}
                >
                  <EyeOff className="w-4 h-4 text-[var(--muted)]" />
                  Desactivar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {mode === 'confirm' && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-6"
          role="dialog"
          aria-modal="true"
          aria-label="Desactivar comentario"
        >
          <div className="bg-[var(--surface)] w-full max-w-[330px] p-5 rounded-3xl shadow-[var(--shadow-pop)]">
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-[17px] font-semibold text-[var(--ink)] font-['Space_Grotesk',sans-serif]">
                Desactivar comentario
              </h2>
              <button onClick={() => setMode('view')} aria-label="Cerrar">
                <X className="w-5 h-5 text-[var(--muted)]" />
              </button>
            </div>
            <p className="text-[14px] text-[var(--muted)] leading-relaxed mb-5">
              Dejará de verse para todos. No se borra, pero no se puede
              reactivar.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('view')}
                className="flex-1 py-2.5 rounded-full text-[14px] font-semibold text-[var(--muted)] bg-[var(--surface-3)]"
              >
                Cancelar
              </button>
              <button
                onClick={deactivate}
                disabled={deactivateComment.isPending}
                className="flex-1 py-2.5 rounded-full text-[14px] font-semibold text-[var(--on-brand)] bg-[var(--brand)] disabled:opacity-40"
              >
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
