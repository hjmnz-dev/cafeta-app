import { useState } from 'react';
import { toast } from 'sonner';
import { COMMENT_MAX, type CommentTarget } from '../lib/comments-api';
import { userMessageOf } from '../lib/http';
import { countChars } from '../lib/posts';
import { useComments, useCreateComment } from '../store/comments-queries';
import { CommentItem } from './CommentItem';

/**
 * HU21 y HU22 · Panel de comentarios bajo la tarjeta (decisión 21) y en el
 * visor de historias (decisión 24): el mismo panel para las dos.
 *
 * Se monta solo al abrirlo, así que la lista se pide cuando hace falta. Los
 * comentarios van del más antiguo al más nuevo, con "Ver más" para las páginas
 * siguientes; el campo de abajo comenta (1 a 500 caracteres). Se refresca con
 * TanStack Query al escribir, sin evento por socket.
 */
export function CommentsPanel({
  target,
  count,
}: {
  target: CommentTarget;
  count: number;
}) {
  const [now] = useState(() => new Date());
  const [draft, setDraft] = useState('');
  const comments = useComments(target, true);
  const createComment = useCreateComment();

  const items = comments.data?.pages.flatMap((page) => page.items) ?? [];
  const used = countChars(draft);
  const tooLong = used > COMMENT_MAX;
  const empty = draft.trim() === '';

  const send = () =>
    createComment.mutate(
      { target, content: draft.trim() },
      {
        onSuccess: () => setDraft(''),
        onError: (error) => toast.error(userMessageOf(error)),
      },
    );

  return (
    <section
      aria-label="Comentarios"
      className="mt-2 pt-2 border-t border-[var(--line-soft)]"
    >
      <h3 className="text-[13px] font-semibold text-[var(--ink)]">
        Comentarios ({count})
      </h3>

      {comments.isPending && (
        <p className="py-3 text-[13px] text-[var(--muted)]">
          Cargando comentarios…
        </p>
      )}

      {comments.isError && (
        <div className="py-3 text-[13px] text-[var(--muted)]">
          <p>No pudimos cargar los comentarios.</p>
          <button
            onClick={() => void comments.refetch()}
            className="font-semibold text-[var(--brand)]"
          >
            Reintentar
          </button>
        </div>
      )}

      {comments.isSuccess && items.length === 0 && (
        <p className="py-3 text-[13px] text-[var(--muted)]">
          Aún no hay comentarios. Sé el primero en comentar.
        </p>
      )}

      {items.length > 0 && (
        <ul className="divide-y divide-[var(--line-soft)]">
          {items.map((comment) => (
            <CommentItem
              key={comment.id}
              target={target}
              comment={comment}
              now={now}
            />
          ))}
        </ul>
      )}

      {comments.hasNextPage && (
        <button
          onClick={() => void comments.fetchNextPage()}
          disabled={comments.isFetchingNextPage}
          className="py-2 text-[13px] font-semibold text-[var(--brand)] disabled:opacity-40"
        >
          {comments.isFetchingNextPage ? 'Cargando…' : 'Ver más comentarios'}
        </button>
      )}

      <div className="mt-2">
        <textarea
          aria-label="Escribe un comentario"
          placeholder="Escribe un comentario"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full min-h-[56px] resize-none text-[14px] text-[var(--ink)] placeholder:text-[var(--muted)] bg-[var(--surface-2)] rounded-xl p-2.5 outline-none"
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
          <button
            onClick={send}
            disabled={empty || tooLong || createComment.isPending}
            className="px-4 py-1.5 rounded-full text-[13px] font-semibold text-[var(--on-brand)] bg-[var(--brand)] disabled:opacity-40"
          >
            Enviar comentario
          </button>
        </div>
      </div>
    </section>
  );
}
